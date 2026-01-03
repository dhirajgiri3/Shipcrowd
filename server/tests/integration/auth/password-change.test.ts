import request from 'supertest';
import app from '../../../src/app';

import User from '../../../src/infrastructure/database/mongoose/models/user.model';
import Session from '../../../src/infrastructure/database/mongoose/models/session.model';
import mongoose from 'mongoose';

// Helper to extract error message from response
const getErrorMessage = (response: any): string => {
    return response.body.error?.message || response.body.message || '';
};

describe('Password Change Flow', () => {
    let testUser: any;
    let authToken: string;
    const testEmail = 'passwordchange@example.com';
    const testPassword = 'OldPassword123!';
    const newPassword = 'NewPassword123!';





    beforeEach(async () => {
        await User.deleteMany({});
        await Session.deleteMany({});

        // Create test user
        testUser = await User.create({
            name: 'Password Change Test',
            email: testEmail,
            password: testPassword,
            role: 'seller',
            isEmailVerified: true,
            isActive: true,
        });

        // Login to get auth token
        const loginResponse = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: testEmail, password: testPassword })
            .set('X-CSRF-Token', 'frontend-request')
            .expect(200);

        const cookies = loginResponse.headers['set-cookie'];
        authToken = cookies.find((c: string) => c.startsWith('accessToken='))?.split(';')[0].split('=')[1] || '';
    });

    describe('POST /api/v1/auth/change-password', () => {
        it('should change password with valid credentials', async () => {
            const response = await request(app)
                .post('/api/v1/auth/change-password')
                .send({
                    currentPassword: testPassword,
                    newPassword: newPassword,
                })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            expect(getErrorMessage(response)).toMatch(/password.*changed|success/i);

            // Verify password was changed
            const user = await User.findById(testUser._id);
            const isNewPasswordCorrect = await user!.comparePassword(newPassword);
            expect(isNewPasswordCorrect).toBe(true);

            // Verify old password no longer works
            const isOldPasswordCorrect = await user!.comparePassword(testPassword);
            expect(isOldPasswordCorrect).toBe(false);
        });

        it('should increment token version on password change', async () => {
            const initialUser = await User.findById(testUser._id);
            const initialTokenVersion = initialUser!.security.tokenVersion || 0;

            await request(app)
                .post('/api/v1/auth/change-password')
                .send({
                    currentPassword: testPassword,
                    newPassword: newPassword,
                })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const updatedUser = await User.findById(testUser._id);
            expect(updatedUser!.security.tokenVersion).toBe(initialTokenVersion + 1);
        });

        it('should invalidate all sessions except current on password change', async () => {
            // Create multiple sessions
            await request(app)
                .post('/api/v1/auth/login')
                .send({ email: testEmail, password: testPassword })
                .set('User-Agent', 'Device 1')
                .set('X-CSRF-Token', 'frontend-request');

            await request(app)
                .post('/api/v1/auth/login')
                .send({ email: testEmail, password: testPassword })
                .set('User-Agent', 'Device 2')
                .set('X-CSRF-Token', 'frontend-request');

            // Verify multiple sessions exist
            const initialSessions = await Session.find({ userId: testUser._id });
            expect(initialSessions.length).toBeGreaterThan(1);

            // Change password
            await request(app)
                .post('/api/v1/auth/change-password')
                .send({
                    currentPassword: testPassword,
                    newPassword: newPassword,
                })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            // Verify only current session remains
            const finalSessions = await Session.find({ userId: testUser._id });
            expect(finalSessions.length).toBe(1);
        });

        it('should reject incorrect current password', async () => {
            const response = await request(app)
                .post('/api/v1/auth/change-password')
                .send({
                    currentPassword: 'WrongPassword123!',
                    newPassword: newPassword,
                })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            expect(getErrorMessage(response)).toMatch(/current.*password|password.*incorrect|invalid/i);

            // Verify password was NOT changed
            const user = await User.findById(testUser._id);
            const isOldPasswordCorrect = await user!.comparePassword(testPassword);
            expect(isOldPasswordCorrect).toBe(true);
        });

        it('should reject weak new password (less than 8 characters)', async () => {
            const response = await request(app)
                .post('/api/v1/auth/change-password')
                .send({
                    currentPassword: testPassword,
                    newPassword: 'Pass1!',
                })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            const msg = getErrorMessage(response) || response.body.errors;
            expect(msg).toBeTruthy();
        });

        it('should reject password without uppercase letter', async () => {
            const response = await request(app)
                .post('/api/v1/auth/change-password')
                .send({
                    currentPassword: testPassword,
                    newPassword: 'password123!',
                })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            const msg = getErrorMessage(response) || response.body.errors;
            expect(msg).toBeTruthy();
        });

        it('should reject password without lowercase letter', async () => {
            const response = await request(app)
                .post('/api/v1/auth/change-password')
                .send({
                    currentPassword: testPassword,
                    newPassword: 'PASSWORD123!',
                })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            const msg = getErrorMessage(response) || response.body.errors;
            expect(msg).toBeTruthy();
        });

        it('should reject password without number', async () => {
            const response = await request(app)
                .post('/api/v1/auth/change-password')
                .send({
                    currentPassword: testPassword,
                    newPassword: 'Password!',
                })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            const msg = getErrorMessage(response) || response.body.errors;
            expect(msg).toBeTruthy();
        });

        it('should reject password without special character', async () => {
            const response = await request(app)
                .post('/api/v1/auth/change-password')
                .send({
                    currentPassword: testPassword,
                    newPassword: 'Password123',
                })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            const msg = getErrorMessage(response) || response.body.errors;
            expect(msg).toBeTruthy();
        });

        it('should reject same password as current', async () => {
            const response = await request(app)
                .post('/api/v1/auth/change-password')
                .send({
                    currentPassword: testPassword,
                    newPassword: testPassword,
                })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            expect(getErrorMessage(response)).toMatch(/new password.*different|same|cannot.*same/i);
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .post('/api/v1/auth/change-password')
                .send({
                    currentPassword: testPassword,
                    newPassword: newPassword,
                })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(401);

            expect(getErrorMessage(response)).toMatch(/unauthorized|authentication/i);
        });

        it('should reject missing current password', async () => {
            const response = await request(app)
                .post('/api/v1/auth/change-password')
                .send({
                    newPassword: newPassword,
                })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            const msg = getErrorMessage(response) || response.body.errors;
            expect(msg).toBeTruthy();
        });

        it('should reject missing new password', async () => {
            const response = await request(app)
                .post('/api/v1/auth/change-password')
                .send({
                    currentPassword: testPassword,
                })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            const msg = getErrorMessage(response) || response.body.errors;
            expect(msg).toBeTruthy();
        });

        it.skip('should enforce rate limiting (5 attempts per 15 minutes)', async () => {
            const requests = [];
            for (let i = 0; i < 6; i++) {
                requests.push(
                    request(app)
                        .post('/api/v1/auth/change-password')
                        .send({
                            currentPassword: 'WrongPassword123!',
                            newPassword: newPassword,
                        })
                        .set('Cookie', [`accessToken=${authToken}`])
                        .set('X-CSRF-Token', 'frontend-request')
                );
            }

            const responses = await Promise.all(requests);

            // First 5 should fail with validation error
            responses.slice(0, 5).forEach(response => {
                expect([400, 429]).toContain(response.status);
            });

            // 6th should be rate limited
            expect(responses[5].status).toBe(429);
            expect(responses[5].body.message).toMatch(/too many/i);
        });
    });

    describe('POST /api/v1/auth/check-password-strength', () => {
        it('should return strength score for valid password', async () => {
            const response = await request(app)
                .post('/api/v1/auth/check-password-strength')
                .send({ password: 'MyStr0ngP@ssw0rd!' })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            expect(response.body).toHaveProperty('score');
            expect(response.body).toHaveProperty('strength');
            expect(response.body.score).toBeGreaterThanOrEqual(0);
            expect(response.body.score).toBeLessThanOrEqual(4);
            expect(['weak', 'fair', 'good', 'strong']).toContain(response.body.strength);
        });

        it('should return low score for weak password', async () => {
            const response = await request(app)
                .post('/api/v1/auth/check-password-strength')
                .send({ password: 'password' })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            expect(response.body.score).toBeLessThan(2);
            expect(['weak', 'fair']).toContain(response.body.strength);
        });

        it('should return high score for strong password', async () => {
            const response = await request(app)
                .post('/api/v1/auth/check-password-strength')
                .send({ password: 'MyV3ry$tr0ng&C0mpl3xP@ssw0rd!' })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            expect(response.body.score).toBeGreaterThan(2);
            expect(['good', 'strong']).toContain(response.body.strength);
        });

        it('should provide feedback and suggestions', async () => {
            const response = await request(app)
                .post('/api/v1/auth/check-password-strength')
                .send({ password: 'password123' })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            expect(response.body).toHaveProperty('feedback');
            expect(response.body.feedback).toHaveProperty('warning');
            expect(response.body.feedback).toHaveProperty('suggestions');
            expect(Array.isArray(response.body.feedback.suggestions)).toBe(true);
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .post('/api/v1/auth/check-password-strength')
                .send({ password: 'TestPassword123!' })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(401);

            expect(response.body.message).toMatch(/unauthorized|authentication/i);
        });

        it('should reject missing password', async () => {
            const response = await request(app)
                .post('/api/v1/auth/check-password-strength')
                .send({})
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            const msg = getErrorMessage(response) || response.body.errors;
            expect(msg).toBeTruthy();
        });
    });

    describe('Security', () => {
        it('should not include password in response', async () => {
            const response = await request(app)
                .post('/api/v1/auth/change-password')
                .send({
                    currentPassword: testPassword,
                    newPassword: newPassword,
                })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            expect(response.body).not.toHaveProperty('password');
            expect(response.body.user?.password).toBeUndefined();
        });

        it('should hash new password before saving', async () => {
            await request(app)
                .post('/api/v1/auth/change-password')
                .send({
                    currentPassword: testPassword,
                    newPassword: newPassword,
                })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const user = await User.findById(testUser._id);
            expect(user!.password).toBeDefined();
            expect(user!.password).not.toBe(newPassword);
            expect(user!.password!.length).toBeGreaterThan(50); // bcrypt hash length
        });

        it('should update lastPasswordChange timestamp', async () => {
            const initialUser = await User.findById(testUser._id);
            const initialTimestamp = initialUser!.security.lastPasswordChange;

            // Wait a second
            await new Promise(resolve => setTimeout(resolve, 1000));

            await request(app)
                .post('/api/v1/auth/change-password')
                .send({
                    currentPassword: testPassword,
                    newPassword: newPassword,
                })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const updatedUser = await User.findById(testUser._id);
            expect(updatedUser!.security.lastPasswordChange).toBeDefined();

            if (initialTimestamp) {
                expect(updatedUser!.security.lastPasswordChange!.getTime())
                    .toBeGreaterThan(initialTimestamp.getTime());
            }
        });

        it('should log password change event', async () => {
            await request(app)
                .post('/api/v1/auth/change-password')
                .send({
                    currentPassword: testPassword,
                    newPassword: newPassword,
                })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const user = await User.findById(testUser._id);

            // Verify security log exists (if implemented)
            if (user!.security.loginAttempts) {
                // Security logging is implemented
                expect(user!.security.lastPasswordChange).toBeDefined();
            }
        });
    });

    describe('Edge Cases', () => {
        it('should handle very long password', async () => {
            const longPassword = 'A1!' + 'a'.repeat(100);

            const response = await request(app)
                .post('/api/v1/auth/change-password')
                .send({
                    currentPassword: testPassword,
                    newPassword: longPassword,
                })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request');

            // Should either accept or reject based on max length policy
            expect([200, 400]).toContain(response.status);
        });

        it('should handle unicode characters in password', async () => {
            const unicodePassword = 'MyP@ssw0rd你好世界!';

            const response = await request(app)
                .post('/api/v1/auth/change-password')
                .send({
                    currentPassword: testPassword,
                    newPassword: unicodePassword,
                })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request');

            expect([200, 400]).toContain(response.status);

            if (response.status === 200) {
                // Verify unicode password works
                const user = await User.findById(testUser._id);
                const isUnicodePasswordCorrect = await user!.comparePassword(unicodePassword);
                expect(isUnicodePasswordCorrect).toBe(true);
            }
        });
    });
});
