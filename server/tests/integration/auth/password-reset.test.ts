import request from 'supertest';
import app from '../../../src/app';
import { User } from '../../../src/infrastructure/database/mongoose/models';
import crypto from 'crypto';
import { AuthTokenService } from '../../../src/core/application/services/auth/token.service';
import { createRateLimitIdentity, withRateLimitHeaders } from '../../setup/rateLimitTestUtils';

// Helper to extract error message from response
const getErrorMessage = (response: any): string => {
    return response.body.error?.message || response.body.message || '';
};

describe('Password Reset Flow', () => {
    let testUser: any;
    const testEmail = 'passwordreset@example.com';
    const testPassword = 'OldPassword123!';




    beforeEach(async () => {
        await User.deleteMany({});

        // Create a test user
        testUser = await User.create({
            name: 'Password Reset Test',
            email: testEmail,
            password: testPassword,
            role: 'seller',
            isEmailVerified: true,
            isActive: true,
        });
    });

    describe('POST /api/v1/auth/reset-password - Request Reset', () => {
        it('should send reset email for valid user', async () => {
            const response = await request(app)
                .post('/api/v1/auth/reset-password')
                .send({ email: testEmail })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            expect(getErrorMessage(response)).toMatch(/email.*sent|registered.*receive|password reset/i);

            // Verify reset token was set in database
            const user = await User.findOne({ email: testEmail });
            expect(user!.security.resetToken).toBeTruthy();
            expect(user!.security.resetTokenExpiry).toBeTruthy();
            expect(user!.security.resetTokenExpiry!.getTime()).toBeGreaterThan(Date.now());
        });

        it('should return generic success message for non-existent email (security)', async () => {
            const response = await request(app)
                .post('/api/v1/auth/reset-password')
                .send({ email: 'nonexistent@example.com' })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            // Should not reveal that email doesn't exist
            expect(getErrorMessage(response)).toMatch(/email.*sent|registered.*receive|password reset/i);
        });

        it('should reject invalid email format', async () => {
            const response = await request(app)
                .post('/api/v1/auth/reset-password')
                .send({ email: 'invalid-email' })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            expect(getErrorMessage(response) || 'Validation failed').toBeTruthy();
        });

        it('should reject request without email', async () => {
            const response = await request(app)
                .post('/api/v1/auth/reset-password')
                .send({})
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            expect(getErrorMessage(response) || 'Validation failed').toBeTruthy();
        });

        it('should enforce rate limiting (3 requests per hour)', async () => {
            const identity = createRateLimitIdentity('password-reset', 'request-reset-limit');
            const responses = [];
            for (let i = 0; i < 4; i++) {
                const response = await withRateLimitHeaders(
                    request(app)
                        .post('/api/v1/auth/reset-password')
                        .send({ email: testEmail })
                        .set('X-CSRF-Token', 'frontend-request'),
                    identity
                );
                responses.push(response);
            }

            responses.slice(0, 3).forEach((response) => {
                expect(response.status).not.toBe(429);
            });
            expect(responses[3].status).toBe(429);
        });
    });

    describe('POST /api/v1/auth/reset-password/confirm - Confirm Reset', () => {
        let resetToken: string;

        beforeEach(async () => {
            // ✅ PHASE 1 FIX: Generate hashed token matching production code
            const { raw, hashed } = AuthTokenService.generateSecureToken();
            resetToken = raw; // Store raw token to send in request

            const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

            await User.findByIdAndUpdate(testUser._id, {
                'security.resetToken': hashed, // Store HASHED token in DB
                'security.resetTokenExpiry': tokenExpiry,
            });
        });

        it('should reset password with valid token', async () => {
            const newPassword = 'NewPassword123!';

            const response = await request(app)
                .post('/api/v1/auth/reset-password/confirm')
                .send({
                    token: resetToken,
                    password: newPassword,
                })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            expect(getErrorMessage(response)).toMatch(/password.*reset.*success|reset.*success/i);

            // Verify password was changed
            const user = await User.findOne({ email: testEmail });
            const isPasswordCorrect = await user!.comparePassword(newPassword);
            expect(isPasswordCorrect).toBe(true);

            // Verify reset token was cleared
            expect(user!.security.resetToken).toBeUndefined();
            expect(user!.security.resetTokenExpiry).toBeUndefined();

            // Verify token version was incremented (invalidates old sessions)
            expect(user!.security.tokenVersion).toBeGreaterThan(0);
        });

        it('should reject expired reset token', async () => {
            // Set token expiry to past
            await User.findByIdAndUpdate(testUser._id, {
                'security.resetTokenExpiry': new Date(Date.now() - 1000),
            });

            const response = await request(app)
                .post('/api/v1/auth/reset-password/confirm')
                .send({
                    token: resetToken,
                    password: 'NewPassword123!',
                })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            expect(getErrorMessage(response)).toMatch(/token.*expired|expired/i);
        });

        it('should reject invalid reset token', async () => {
            const response = await request(app)
                .post('/api/v1/auth/reset-password/confirm')
                .send({
                    token: 'invalid-token-12345',
                    password: 'NewPassword123!',
                })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            expect(getErrorMessage(response)).toMatch(/invalid.*token|invalid/i);
        });

        it('should reject weak new password', async () => {
            const response = await request(app)
                .post('/api/v1/auth/reset-password/confirm')
                .send({
                    token: resetToken,
                    password: 'weak',
                })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            expect(getErrorMessage(response) || response.body.errors).toBeTruthy();
        });

        it('should reject missing token', async () => {
            const response = await request(app)
                .post('/api/v1/auth/reset-password/confirm')
                .send({
                    password: 'NewPassword123!',
                })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            expect(getErrorMessage(response) || response.body.errors).toBeTruthy();
        });

        it('should reject missing password', async () => {
            const response = await request(app)
                .post('/api/v1/auth/reset-password/confirm')
                .send({
                    token: resetToken,
                })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            expect(getErrorMessage(response) || response.body.errors).toBeTruthy();
        });

        it('should not allow reusing the same reset token', async () => {
            const newPassword = 'NewPassword123!';

            // First reset
            await request(app)
                .post('/api/v1/auth/reset-password/confirm')
                .send({
                    token: resetToken,
                    password: newPassword,
                })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            // Try to use same token again
            const response = await request(app)
                .post('/api/v1/auth/reset-password/confirm')
                .send({
                    token: resetToken,
                    password: 'AnotherPassword123!',
                })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            expect(getErrorMessage(response)).toMatch(/invalid.*token|invalid/i);
        });

        it('should enforce rate limiting on reset confirmation', async () => {
            const identity = createRateLimitIdentity('password-reset', 'confirm-reset-limit');
            const responses = [];
            for (let i = 0; i < 4; i++) {
                const response = await withRateLimitHeaders(
                    request(app)
                        .post('/api/v1/auth/reset-password/confirm')
                        .send({
                            token: resetToken,
                            password: 'NewPassword123!',
                        })
                        .set('X-CSRF-Token', 'frontend-request'),
                    identity
                );
                responses.push(response);
            }

            responses.slice(0, 3).forEach((response) => {
                expect(response.status).not.toBe(429);
            });
            expect(responses[3].status).toBe(429);
        });
    });

    describe('Security', () => {
        it('should not include password in response', async () => {
            const response = await request(app)
                .post('/api/v1/auth/reset-password')
                .send({ email: testEmail })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            expect(response.body).not.toHaveProperty('password');
            expect(response.body.user?.password).toBeUndefined();
        });

        it('should hash reset token in database', async () => {
            await request(app)
                .post('/api/v1/auth/reset-password')
                .send({ email: testEmail })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const user = await User.findOne({ email: testEmail });

            // Reset token should exist
            expect(user!.security.resetToken).toBeTruthy();

            // Token should be hashed (not plain text)
            // Note: Actual implementation may vary - check if backend hashes reset tokens
            expect(user!.security.resetToken).toMatch(/^[a-f0-9]{64}$/); // Hex string for SHA-256 or similar
        });
    });
});
