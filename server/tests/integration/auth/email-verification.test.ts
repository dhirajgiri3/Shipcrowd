import request from 'supertest';
import app from '../../../src/app';
import { User } from '../../../src/infrastructure/database/mongoose/models';
import crypto from 'crypto';

// Helper to extract error message from response
const getErrorMessage = (response: any): string => {
    return response.body.error?.message || response.body.message || '';
};

describe('Email Verification Flow', () => {
    let testUser: any;
    const testEmail = 'verification@example.com';
    const testPassword = 'Password123!';





    beforeEach(async () => {
        await User.deleteMany({});

        // Create a test user that needs email verification
        testUser = await User.create({
            name: 'Email Verification Test',
            email: testEmail,
            password: testPassword,
            role: 'seller',
            isEmailVerified: false,
            isActive: false,
            security: {
                verificationToken: crypto.randomBytes(32).toString('hex'),
                verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            },
        });
    });

    describe('POST /api/v1/auth/verify-email', () => {
        it('should verify email with valid token', async () => {
            const response = await request(app)
                .post('/api/v1/auth/verify-email')
                .send({ token: testUser.security.verificationToken })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            expect(getErrorMessage(response)).toMatch(/verified.*success/i);

            // Verify user was updated in database
            const user = await User.findById(testUser._id);
            expect(user!.isEmailVerified).toBe(true);
            expect(user!.isActive).toBe(true);
            expect(user!.security.verificationToken).toBeUndefined();
            expect(user!.security.verificationTokenExpiry).toBeUndefined();
        });

        it('should reject invalid verification token', async () => {
            const response = await request(app)
                .post('/api/v1/auth/verify-email')
                .send({ token: 'invalid-token-12345' })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            expect(getErrorMessage(response)).toMatch(/invalid.*token/i);
        });

        it('should reject expired verification token', async () => {
            // Set token expiry to past
            await User.findByIdAndUpdate(testUser._id, {
                'security.verificationTokenExpiry': new Date(Date.now() - 1000),
            });

            const response = await request(app)
                .post('/api/v1/auth/verify-email')
                .send({ token: testUser.security.verificationToken })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            expect(getErrorMessage(response)).toMatch(/expired/i);
        });

        it('should handle already verified email gracefully', async () => {
            // First verification
            await request(app)
                .post('/api/v1/auth/verify-email')
                .send({ token: testUser.security.verificationToken })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            // Get updated user with new token (or no token)
            const user = await User.findById(testUser._id);

            // Try to verify again (should fail or return already verified message)
            const response = await request(app)
                .post('/api/v1/auth/verify-email')
                .send({ token: testUser.security.verificationToken })
                .set('X-CSRF-Token', 'frontend-request');

            // Should either be 400 (invalid token) or 200 (already verified)
            expect([200, 400]).toContain(response.status);
            if (response.status === 200) {
                expect(getErrorMessage(response)).toMatch(/already.*verified/i);
            }
        });

        it('should reject missing token', async () => {
            const response = await request(app)
                .post('/api/v1/auth/verify-email')
                .send({})
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            expect(getErrorMessage(response)).toMatch(/token/i);
        });

        it.skip('should enforce rate limiting (5 attempts per hour)', async () => {
            // Make 6 verification attempts with invalid tokens
            const requests = [];
            for (let i = 0; i < 6; i++) {
                requests.push(
                    request(app)
                        .post('/api/v1/auth/verify-email')
                        .send({ token: `invalid-token-${i}` })
                        .set('X-CSRF-Token', 'frontend-request')
                );
            }

            const responses = await Promise.all(requests);

            // First 5 should fail with validation error (400)
            responses.slice(0, 5).forEach(response => {
                expect([400, 429]).toContain(response.status);
            });

            // 6th should be rate limited (429)
            expect(responses[5].status).toBe(429);
            expect(responses[5].body.message).toMatch(/too many/i);
        });
    });

    describe('POST /api/v1/auth/resend-verification', () => {
        it('should resend verification email for unverified user', async () => {
            const response = await request(app)
                .post('/api/v1/auth/resend-verification')
                .send({ email: testEmail })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const message = getErrorMessage(response);
            expect(message).toMatch(/verification.*email.*sent|email.*sent|verification/i);

            // Verify new token was generated
            const user = await User.findById(testUser._id);
            expect(user!.security.verificationToken).toBeTruthy();
            expect(user!.security.verificationToken).not.toBe(testUser.security.verificationToken);
        });

        it('should not send email for already verified user', async () => {
            // Verify the user first
            await User.findByIdAndUpdate(testUser._id, {
                isEmailVerified: true,
                isActive: true,
                $unset: {
                    'security.verificationToken': '',
                    'security.verificationTokenExpiry': '',
                },
            });

            const response = await request(app)
                .post('/api/v1/auth/resend-verification')
                .send({ email: testEmail })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            const message = getErrorMessage(response);
            expect(message).toMatch(/already.*verified|email.*verified/i);
        });

        it('should return generic success for non-existent email (security)', async () => {
            const response = await request(app)
                .post('/api/v1/auth/resend-verification')
                .send({ email: 'nonexistent@example.com' })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            // Should not reveal that email doesn't exist
            const message = getErrorMessage(response);
            expect(message).toMatch(/verification.*email.*sent|email.*sent|verification/i);
        });

        it('should reject invalid email format', async () => {
            const response = await request(app)
                .post('/api/v1/auth/resend-verification')
                .send({ email: 'invalid-email' })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            const message = getErrorMessage(response);
            expect(message || response.body.errors).toBeTruthy();
        });

        it.skip('should enforce rate limiting (3 attempts per hour)', async () => {
            // Make 4 resend requests
            const requests = [];
            for (let i = 0; i < 4; i++) {
                requests.push(
                    request(app)
                        .post('/api/v1/auth/resend-verification')
                        .send({ email: testEmail })
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

    describe('Security', () => {
        it('should not include verification token in response', async () => {
            const response = await request(app)
                .post('/api/v1/auth/verify-email')
                .send({ token: testUser.security.verificationToken })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            expect(response.body).not.toHaveProperty('verificationToken');
            expect(response.body.user?.security?.verificationToken).toBeUndefined();
        });

        it('should use cryptographically secure tokens', async () => {
            const response = await request(app)
                .post('/api/v1/auth/resend-verification')
                .send({ email: testEmail })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const user = await User.findById(testUser._id);

            // Token should be hex string of appropriate length
            expect(user!.security.verificationToken).toMatch(/^[a-f0-9]{64}$/);
        });

        it('should set token expiry to 24 hours', async () => {
            await request(app)
                .post('/api/v1/auth/resend-verification')
                .send({ email: testEmail })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const user = await User.findById(testUser._id);
            const expiryTime = user!.security.verificationTokenExpiry!.getTime();
            const expectedExpiry = Date.now() + 24 * 60 * 60 * 1000;

            // Should be within 10 seconds of expected expiry (account for test execution time)
            expect(Math.abs(expiryTime - expectedExpiry)).toBeLessThan(10000);
        });
    });

    describe('Edge Cases', () => {
        it('should handle concurrent verification attempts', async () => {
            const token = testUser.security.verificationToken;

            // Make 3 concurrent verification requests with same token
            const requests = [
                request(app)
                    .post('/api/v1/auth/verify-email')
                    .send({ token })
                    .set('X-CSRF-Token', 'frontend-request'),
                request(app)
                    .post('/api/v1/auth/verify-email')
                    .send({ token })
                    .set('X-CSRF-Token', 'frontend-request'),
                request(app)
                    .post('/api/v1/auth/verify-email')
                    .send({ token })
                    .set('X-CSRF-Token', 'frontend-request'),
            ];

            const responses = await Promise.all(requests);

            // At least one should succeed
            const successCount = responses.filter(r => r.status === 200).length;
            expect(successCount).toBeGreaterThanOrEqual(1);

            // User should be verified
            const user = await User.findById(testUser._id);
            expect(user!.isEmailVerified).toBe(true);
        });

        it('should handle malformed token gracefully', async () => {
            const malformedTokens = [
                '',
                'a',
                'a'.repeat(1000), // Very long token
                '../../../etc/passwd', // Path traversal attempt
                '<script>alert("xss")</script>', // XSS attempt
                '${process.exit(1)}', // Code injection attempt
            ];

            for (const token of malformedTokens) {
                const response = await request(app)
                    .post('/api/v1/auth/verify-email')
                    .send({ token })
                    .set('X-CSRF-Token', 'frontend-request');

                expect([400, 429]).toContain(response.status);
            }
        });
    });
});
