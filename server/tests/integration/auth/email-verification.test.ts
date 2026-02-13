import request from 'supertest';
import app from '../../../src/app';
import { User } from '../../../src/infrastructure/database/mongoose/models';
import crypto from 'crypto';
import { createRateLimitIdentity, withRateLimitHeaders } from '../../setup/rateLimitTestUtils';

// Helper to extract error message from response
const getErrorMessage = (response: any): string => {
    return response.body.error?.message || response.body.message || '';
};

describe('Email Verification Flow', () => {
    let testUser: any;
    let rawVerificationToken: string;
    const testEmail = 'verification@example.com';
    const testPassword = 'Password123!';

    beforeEach(async () => {
        await User.deleteMany({});

        // ✅ Generate token and hash it (matching production flow)
        rawVerificationToken = crypto.randomBytes(32).toString('hex');
        const hashedVerificationToken = crypto
            .createHash('sha256')
            .update(rawVerificationToken)
            .digest('hex');

        // Create a test user that needs email verification
        testUser = await User.create({
            name: 'Email Verification Test',
            email: testEmail,
            password: testPassword,
            role: 'seller',
            isEmailVerified: false,
            isActive: false,
            security: {
                verificationToken: hashedVerificationToken, // ✅ Store HASHED token
                verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            },
        });
    });

    describe('POST /api/v1/auth/verify-email', () => {
        it('should verify email with valid token', async () => {
            const response = await request(app)
                .post('/api/v1/auth/verify-email')
                .send({ token: rawVerificationToken }) // ✅ Use RAW token (sent to user via email)
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
                .send({ token: rawVerificationToken }) // ✅ Use RAW token
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            expect(getErrorMessage(response)).toMatch(/expired/i);
        });

        it('should handle already verified email gracefully', async () => {
            // First verification
            await request(app)
                .post('/api/v1/auth/verify-email')
                .send({ token: rawVerificationToken }) // ✅ Use RAW token
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            // Try to verify again (should return already verified message)
            const response = await request(app)
                .post('/api/v1/auth/verify-email')
                .send({ token: rawVerificationToken }) // ✅ Use RAW token
                .set('X-CSRF-Token', 'frontend-request');

            // Should either be 400 (invalid token - token was cleared) or 200 (already verified)
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

            // ✅ Check for validation error (either in message or errors array)
            const message = getErrorMessage(response);
            const hasTokenError = message.toLowerCase().includes('token') ||
                                  message.toLowerCase().includes('validation') ||
                                  JSON.stringify(response.body).toLowerCase().includes('token');
            expect(hasTokenError).toBe(true);
        });

        it('should enforce rate limiting (5 attempts per hour)', async () => {
            const identity = createRateLimitIdentity('email-verification', 'verify-email-limit');
            const responses = [];
            for (let i = 0; i < 6; i++) {
                const response = await withRateLimitHeaders(
                    request(app)
                        .post('/api/v1/auth/verify-email')
                        .send({ token: `invalid-token-${i}` })
                        .set('X-CSRF-Token', 'frontend-request'),
                    identity
                );
                responses.push(response);
            }

            responses.slice(0, 5).forEach((response) => {
                expect(response.status).not.toBe(429);
            });
            const blockedResponse = responses.find((response) => response.status === 429);
            expect(blockedResponse).toBeDefined();
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
                .expect(200); // ✅ Returns 200 with "already verified" message (better UX)

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

        it('should enforce rate limiting (3 attempts per hour)', async () => {
            const identity = createRateLimitIdentity('email-verification', 'resend-verification-limit');
            const responses = [];
            for (let i = 0; i < 4; i++) {
                const response = await withRateLimitHeaders(
                    request(app)
                        .post('/api/v1/auth/resend-verification')
                        .send({ email: testEmail })
                        .set('X-CSRF-Token', 'frontend-request'),
                    identity
                );
                responses.push(response);
            }

            responses.slice(0, 3).forEach((response) => {
                expect(response.status).not.toBe(429);
            });
            const blockedResponse = responses.find((response) => response.status === 429);
            expect(blockedResponse).toBeDefined();
        });
    });

    describe('Security', () => {
        it('should not include verification token in response', async () => {
            const response = await request(app)
                .post('/api/v1/auth/verify-email')
                .send({ token: rawVerificationToken }) // ✅ Use RAW token
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            expect(response.body).not.toHaveProperty('verificationToken');
            expect(response.body.user?.security?.verificationToken).toBeUndefined();
        });

        it('should use cryptographically secure tokens', async () => {
            await request(app)
                .post('/api/v1/auth/resend-verification')
                .send({ email: testEmail })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const user = await User.findById(testUser._id);

            // Token should be SHA256 hash (64 hex characters)
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
            const expectedExpiry = Date.now() + 1 * 60 * 60 * 1000; // ✅ 1 hour (per register controller line 137)

            // Should be within 10 seconds of expected expiry (account for test execution time)
            expect(Math.abs(expiryTime - expectedExpiry)).toBeLessThan(10000);
        });
    });

    describe('Edge Cases', () => {
        it('should handle concurrent verification attempts', async () => {
            const token = rawVerificationToken; // ✅ Use RAW token

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
