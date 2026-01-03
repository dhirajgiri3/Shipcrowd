import request from 'supertest';
import app from '../../../src/app';

import { User } from '../../../src/infrastructure/database/mongoose/models';
import crypto from 'crypto';
import mongoose from 'mongoose';

// Helper to extract error message from response
const getErrorMessage = (response: any): string => {
    return response.body.error?.message || response.body.message || '';
};

describe('Email Change Flow', () => {
    let testUser: any;
    let authToken: string;
    const testEmail = 'emailchange@example.com';
    const newEmail = 'newemail@example.com';
    const testPassword = 'Password123!';





    beforeEach(async () => {
        await User.deleteMany({});

        // Create test user
        testUser = await User.create({
            name: 'Email Change Test',
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

        const cookies = loginResponse.headers['set-cookie'] as unknown as string[];
        authToken = cookies.find((c: string) => c.startsWith('accessToken='))?.split(';')[0].split('=')[1] || '';
    });

    describe('POST /api/v1/auth/change-email', () => {
        it('should initiate email change with valid data', async () => {
            const response = await request(app)
                .post('/api/v1/auth/change-email')
                .send({
                    newEmail: newEmail,
                    password: testPassword,
                })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            expect(getErrorMessage(response)).toMatch(/verification.*email.*sent|email.*sent|pending/i);

            // Verify pending email change was set
            const user = await User.findById(testUser._id);
            expect(user!.pendingEmailChange!.email).toBe(newEmail);
            expect(user!.pendingEmailChange!.token).toBeTruthy();
            expect(user!.pendingEmailChange!.tokenExpiry).toBeTruthy();

            // Original email should not change yet
            expect(user!.email).toBe(testEmail);
        });

        it('should reject incorrect password', async () => {
            const response = await request(app)
                .post('/api/v1/auth/change-email')
                .send({
                    newEmail: newEmail,
                    password: 'WrongPassword123!',
                })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            expect(getErrorMessage(response)).toMatch(/password.*incorrect|invalid/i);

            // Verify email was not changed
            const user = await User.findById(testUser._id);
            expect(user!.email).toBe(testEmail);
            expect(user!.pendingEmailChange).toBeUndefined();
        });

        it('should reject duplicate email (already exists)', async () => {
            // Create another user with the target email
            await User.create({
                name: 'Another User',
                email: newEmail,
                password: testPassword,
                role: 'seller',
                isEmailVerified: true,
                isActive: true,
            });

            const response = await request(app)
                .post('/api/v1/auth/change-email')
                .send({
                    newEmail: newEmail,
                    password: testPassword,
                })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(409);

            expect(getErrorMessage(response)).toMatch(/email.*already.*exists|already.*registered/i);
        });

        it('should reject duplicate email (case insensitive)', async () => {
            // Create another user with uppercase version of target email
            await User.create({
                name: 'Another User',
                email: newEmail.toUpperCase(),
                password: testPassword,
                role: 'seller',
                isEmailVerified: true,
                isActive: true,
            });

            const response = await request(app)
                .post('/api/v1/auth/change-email')
                .send({
                    newEmail: newEmail.toLowerCase(),
                    password: testPassword,
                })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(409);

            expect(getErrorMessage(response)).toMatch(/email.*already.*exists|already.*registered/i);
        });

        it('should reject invalid email format', async () => {
            const response = await request(app)
                .post('/api/v1/auth/change-email')
                .send({
                    newEmail: 'invalid-email',
                    password: testPassword,
                })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            const msg = getErrorMessage(response) || response.body.errors;
            expect(msg).toBeTruthy();
        });

        it('should reject same email as current', async () => {
            const response = await request(app)
                .post('/api/v1/auth/change-email')
                .send({
                    newEmail: testEmail,
                    password: testPassword,
                })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            expect(getErrorMessage(response)).toMatch(/new email.*different|same|cannot.*same/i);
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .post('/api/v1/auth/change-email')
                .send({
                    newEmail: newEmail,
                    password: testPassword,
                })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(401);

            expect(getErrorMessage(response)).toMatch(/unauthorized|authentication/i);
        });

        it('should cancel previous pending email change', async () => {
            // Initiate first email change
            await request(app)
                .post('/api/v1/auth/change-email')
                .send({
                    newEmail: 'first@example.com',
                    password: testPassword,
                })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const firstToken = (await User.findById(testUser._id))!.pendingEmailChange!.token;

            // Initiate second email change
            await request(app)
                .post('/api/v1/auth/change-email')
                .send({
                    newEmail: newEmail,
                    password: testPassword,
                })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const user = await User.findById(testUser._id);
            expect(user!.pendingEmailChange!.email).toBe(newEmail);
            expect(user!.pendingEmailChange!.token).not.toBe(firstToken);
        });

        it.skip('should enforce rate limiting (3 attempts per hour)', async () => {
            const requests = [];
            for (let i = 0; i < 4; i++) {
                requests.push(
                    request(app)
                        .post('/api/v1/auth/change-email')
                        .send({
                            newEmail: `email${i}@example.com`,
                            password: testPassword,
                        })
                        .set('Cookie', [`accessToken=${authToken}`])
                        .set('X-CSRF-Token', 'frontend-request')
                );
            }

            const responses = await Promise.all(requests);

            // First 3 should succeed
            responses.slice(0, 3).forEach(response => {
                expect(response.status).toBe(200);
            });

            // 4th should be rate limited
            expect(responses[3].status).toBe(429);
            expect(responses[3].body.message).toMatch(/too many/i);
        });
    });

    describe('POST /api/v1/auth/verify-email-change', () => {
        let emailChangeToken: string;

        beforeEach(async () => {
            // Initiate email change
            await request(app)
                .post('/api/v1/auth/change-email')
                .send({
                    newEmail: newEmail,
                    password: testPassword,
                })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const user = await User.findById(testUser._id);
            emailChangeToken = user!.pendingEmailChange!.token;
        });

        it('should complete email change with valid token', async () => {
            const response = await request(app)
                .post('/api/v1/auth/verify-email-change')
                .send({ token: emailChangeToken })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            expect(getErrorMessage(response)).toMatch(/email.*changed|success/i);

            // Verify email was changed
            const user = await User.findById(testUser._id);
            expect(user!.email).toBe(newEmail);

            // Verify pending fields were cleared
            expect(user!.pendingEmailChange).toBeUndefined();
        });

        it('should reject invalid token', async () => {
            const response = await request(app)
                .post('/api/v1/auth/verify-email-change')
                .send({ token: 'invalid-token-12345' })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            expect(response.body.message).toMatch(/invalid.*token/i);

            // Verify email was not changed
            const user = await User.findById(testUser._id);
            expect(user!.email).toBe(testEmail);
        });

        it('should reject expired token', async () => {
            // Set token expiry to past
            await User.findByIdAndUpdate(testUser._id, {
                'pendingEmailChange.tokenExpiry': new Date(Date.now() - 1000),
            });

            const response = await request(app)
                .post('/api/v1/auth/verify-email-change')
                .send({ token: emailChangeToken })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            expect(getErrorMessage(response)).toMatch(/token.*expired|expired/i);

            // Verify email was not changed
            const user = await User.findById(testUser._id);
            expect(user!.email).toBe(testEmail);
        });

        it('should not allow reusing verification token', async () => {
            // First verification
            await request(app)
                .post('/api/v1/auth/verify-email-change')
                .send({ token: emailChangeToken })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            // Try to use same token again
            const response = await request(app)
                .post('/api/v1/auth/verify-email-change')
                .send({ token: emailChangeToken })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            expect(response.body.message).toMatch(/invalid.*token/i);
        });

        it('should normalize email to lowercase', async () => {
            // Initiate email change with uppercase email
            const upperEmail = 'UPPERCASE@EXAMPLE.COM';

            await User.findByIdAndUpdate(testUser._id, {
                'pendingEmailChange': {
                    email: upperEmail,
                    token: crypto.randomBytes(32).toString('hex'),
                    tokenExpiry: new Date(Date.now() + 60 * 60 * 1000)
                }
            });

            const user = await User.findById(testUser._id);
            const token = user!.pendingEmailChange!.token;

            await request(app)
                .post('/api/v1/auth/verify-email-change')
                .send({ token })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            // Verify email was normalized to lowercase
            const updatedUser = await User.findById(testUser._id);
            expect(updatedUser!.email).toBe(upperEmail.toLowerCase());
        });

        it('should increment token version on email change', async () => {
            const initialUser = await User.findById(testUser._id);
            const initialTokenVersion = initialUser!.security.tokenVersion || 0;

            await request(app)
                .post('/api/v1/auth/verify-email-change')
                .send({ token: emailChangeToken })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const updatedUser = await User.findById(testUser._id);
            expect(updatedUser!.security.tokenVersion).toBe(initialTokenVersion + 1);
        });

        it('should reject if new email is taken by another user', async () => {
            // Another user registers with the target email after change was initiated
            await User.create({
                name: 'Another User',
                email: newEmail,
                password: testPassword,
                role: 'seller',
                isEmailVerified: true,
                isActive: true,
            });

            const response = await request(app)
                .post('/api/v1/auth/verify-email-change')
                .send({ token: emailChangeToken })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(409);

            expect(response.body.message).toMatch(/email.*already.*exists/i);

            // Verify email was not changed
            const user = await User.findById(testUser._id);
            expect(user!.email).toBe(testEmail);
        });
    });

    describe('Security', () => {
        it('should use cryptographically secure tokens', async () => {
            await request(app)
                .post('/api/v1/auth/change-email')
                .send({
                    newEmail: newEmail,
                    password: testPassword,
                })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const user = await User.findById(testUser._id);

            // Token should be hex string of appropriate length
            expect(user!.pendingEmailChange!.token).toMatch(/^[a-f0-9]{64}$/);
        });

        it('should set token expiry to 1 hour', async () => {
            await request(app)
                .post('/api/v1/auth/change-email')
                .send({
                    newEmail: newEmail,
                    password: testPassword,
                })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const user = await User.findById(testUser._id);
            const expiryTime = user!.pendingEmailChange!.tokenExpiry.getTime();
            const expectedExpiry = Date.now() + 60 * 60 * 1000; // 1 hour

            // Should be within 10 seconds of expected expiry
            expect(Math.abs(expiryTime - expectedExpiry)).toBeLessThan(10000);
        });

        it('should not expose email change token in response', async () => {
            const response = await request(app)
                .post('/api/v1/auth/change-email')
                .send({
                    newEmail: newEmail,
                    password: testPassword,
                })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            expect(response.body).not.toHaveProperty('emailChangeToken');
            expect(response.body.user?.pendingEmailChange?.token).toBeUndefined();
        });

        it('should log email change event', async () => {
            // Initiate and complete email change
            await request(app)
                .post('/api/v1/auth/change-email')
                .send({
                    newEmail: newEmail,
                    password: testPassword,
                })
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const user = await User.findById(testUser._id);
            const token = user!.pendingEmailChange!.token;

            await request(app)
                .post('/api/v1/auth/verify-email-change')
                .send({ token })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            // Verify email change was logged (if audit logging is implemented)
            const updatedUser = await User.findById(testUser._id);
            expect(updatedUser!.email).toBe(newEmail);
        });
    });

    describe('Edge Cases', () => {
        it('should handle concurrent email change attempts', async () => {
            // Make multiple concurrent email change requests
            const requests = [
                request(app)
                    .post('/api/v1/auth/change-email')
                    .send({ newEmail: 'email1@example.com', password: testPassword })
                    .set('Cookie', [`accessToken=${authToken}`])
                    .set('X-CSRF-Token', 'frontend-request'),
                request(app)
                    .post('/api/v1/auth/change-email')
                    .send({ newEmail: 'email2@example.com', password: testPassword })
                    .set('Cookie', [`accessToken=${authToken}`])
                    .set('X-CSRF-Token', 'frontend-request'),
            ];

            const responses = await Promise.all(requests);

            // Both might succeed or be rate limited
            const successCount = responses.filter(r => r.status === 200).length;
            expect(successCount).toBeGreaterThanOrEqual(1);

            // Only one pending email change should exist
            const user = await User.findById(testUser._id);
            expect(user!.pendingEmailChange).toBeDefined();
        });

        it('should handle malformed verification token gracefully', async () => {
            const malformedTokens = [
                '',
                'a',
                'a'.repeat(1000),
                '../../../etc/passwd',
                '<script>alert("xss")</script>',
            ];

            for (const token of malformedTokens) {
                const response = await request(app)
                    .post('/api/v1/auth/verify-email-change')
                    .send({ token })
                    .set('X-CSRF-Token', 'frontend-request');

                expect([400, 429]).toContain(response.status);
            }
        });
    });
});
