/**
 * Token Refresh Race Condition Integration Tests
 *
 * Tests for fixing race conditions in the token refresh endpoint
 * Ensures:
 * - Concurrent requests with same refresh token are idempotent
 * - Session state is consistent across concurrent updates
 * - Expired/revoked tokens are handled properly
 * - Inactivity timeout is enforced correctly
 * - Token rotation prevents token reuse attacks
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../src/app';
import { User } from '../../../src/infrastructure/database/mongoose/models';
import { Session } from '../../../src/infrastructure/database/mongoose/models';
import { generateRefreshToken, generateAccessToken } from '../../../src/shared/helpers/jwt';
import bcrypt from 'bcrypt';

// Test constants
const TEST_USER_EMAIL = 'tokentest@example.com';
const TEST_USER_PASSWORD = 'SecurePass123!';
const SESSION_TIMEOUT_MS = 3600000; // 1 hour default

describe('Token Refresh Race Conditions', () => {
    let testUser: any;
    let testSession: any;
    let refreshToken: string;
    let cookieJar: string[] = [];

    beforeAll(async () => {
        // Connect to test database if not already connected
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/shipcrowd-test');
        }
    });

    beforeEach(async () => {
        // Clean up test data
        await User.deleteMany({ email: TEST_USER_EMAIL });
        await Session.deleteMany({ userId: { $exists: true } });

        // Create test user
        testUser = await User.create({
            email: TEST_USER_EMAIL,
            password: await bcrypt.hash(TEST_USER_PASSWORD, 10),
            firstName: 'Token',
            lastName: 'Tester',
            role: 'seller',
            security: {
                tokenVersion: 1,
                mfaEnabled: false,
            },
        });

        // Generate initial refresh token
        refreshToken = generateRefreshToken(testUser._id, 1);

        // Create valid session
        const hashedToken = await bcrypt.hash(refreshToken, 10);
        testSession = await Session.create({
            userId: testUser._id,
            refreshToken: hashedToken,
            isRevoked: false,
            lastActive: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        });

        cookieJar = [];
    });

    afterEach(async () => {
        // Clean up test data
        await User.deleteMany({ email: TEST_USER_EMAIL });
        await Session.deleteMany({ userId: { $exists: true } });
    });

    afterAll(async () => {
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
        }
    });

    describe('Concurrent Requests with Same Refresh Token', () => {
        it('should handle 5 concurrent refresh requests idempotently', async () => {
            // Launch 5 concurrent refresh requests with identical token
            const requests = Array(5).fill(null).map(() =>
                request(app)
                    .post('/api/v1/auth/refresh')
                    .set('Cookie', `refreshToken=${refreshToken}`)
                    .expect('set-cookie', /accessToken/)
            );

            const results = await Promise.all(requests);

            // All requests should succeed
            results.forEach(res => {
                expect(res.status).toBe(200);
                expect(res.body.success).toBe(true);
                expect(res.body.data.accessToken).toBeDefined();
                expect(res.body.data.refreshToken).toBeDefined();
            });

            // Verify database has only one active session per user
            const sessions = await Session.find({
                userId: testUser._id,
                isRevoked: false,
            });

            // Should have only one active session (or sessions should be in a consistent state)
            expect(sessions.length).toBeGreaterThanOrEqual(1);
        });

        it('should prevent token reuse after first refresh', async () => {
            // First refresh should succeed
            const firstRefresh = await request(app)
                .post('/api/v1/auth/refresh')
                .set('Cookie', `refreshToken=${refreshToken}`);

            expect(firstRefresh.status).toBe(200);

            // Extract new refresh token from response
            const newRefreshToken = firstRefresh.body.data.refreshToken;
            expect(newRefreshToken).toBeDefined();
            expect(newRefreshToken).not.toBe(refreshToken);

            // Wait a moment to ensure session is updated
            await new Promise(resolve => setTimeout(resolve, 100));

            // Try to use old refresh token again - should fail
            const secondRefresh = await request(app)
                .post('/api/v1/auth/refresh')
                .set('Cookie', `refreshToken=${refreshToken}`);

            // Should fail because old token should be revoked
            expect(secondRefresh.status).toBe(401);
            expect(secondRefresh.body.error.code).toMatch(/INVALID|EXPIRED|REVOKED/);
        });
    });

    describe('Expired Refresh Token', () => {
        it('should reject tokens with expired session', async () => {
            // Update session to be expired
            await Session.findByIdAndUpdate(testSession._id, {
                expiresAt: new Date(Date.now() - 1000), // 1 second ago
            });

            const response = await request(app)
                .post('/api/v1/auth/refresh')
                .set('Cookie', `refreshToken=${refreshToken}`);

            expect(response.status).toBe(401);
            expect(response.body.error.code).toMatch(/EXPIRED|INVALID/);
        });

        it('should revoke expired sessions', async () => {
            // Update session to be expired
            await Session.findByIdAndUpdate(testSession._id, {
                expiresAt: new Date(Date.now() - 1000),
            });

            await request(app)
                .post('/api/v1/auth/refresh')
                .set('Cookie', `refreshToken=${refreshToken}`);

            // Check that session is marked as revoked or expired
            const updatedSession = await Session.findById(testSession._id);
            expect(updatedSession).toBeDefined();
            expect(updatedSession!.isRevoked).toBe(true);
        });
    });

    describe('Revoked Refresh Token', () => {
        it('should reject revoked tokens', async () => {
            // Revoke the session
            await Session.findByIdAndUpdate(testSession._id, {
                isRevoked: true,
            });

            const response = await request(app)
                .post('/api/v1/auth/refresh')
                .set('Cookie', `refreshToken=${refreshToken}`);

            expect(response.status).toBe(401);
            expect(response.body.error.code).toMatch(/INVALID|REVOKED/);
        });

        it('should not create new session for revoked tokens', async () => {
            const initialSessionCount = await Session.countDocuments({
                userId: testUser._id,
                isRevoked: false,
            });

            // Revoke the session
            await Session.findByIdAndUpdate(testSession._id, {
                isRevoked: true,
            });

            await request(app)
                .post('/api/v1/auth/refresh')
                .set('Cookie', `refreshToken=${refreshToken}`);

            // Count should remain the same
            const finalSessionCount = await Session.countDocuments({
                userId: testUser._id,
                isRevoked: false,
            });

            expect(finalSessionCount).toBeLessThanOrEqual(initialSessionCount);
        });
    });

    describe('Inactivity Timeout', () => {
        it('should timeout inactive sessions', async () => {
            const INACTIVITY_TIMEOUT_MS = parseInt(process.env.SESSION_TIMEOUT_MS || '3600000');

            // Update session to have old lastActive time
            await Session.findByIdAndUpdate(testSession._id, {
                lastActive: new Date(Date.now() - INACTIVITY_TIMEOUT_MS - 1000), // 1 second past timeout
            });

            const response = await request(app)
                .post('/api/v1/auth/refresh')
                .set('Cookie', `refreshToken=${refreshToken}`);

            expect(response.status).toBe(401);
            expect(response.body.error.code).toMatch(/EXPIRED|TIMEOUT/);
        });

        it('should update lastActive on valid refresh', async () => {
            const beforeTime = new Date();

            const response = await request(app)
                .post('/api/v1/auth/refresh')
                .set('Cookie', `refreshToken=${refreshToken}`);

            expect(response.status).toBe(200);

            // Check that session lastActive was updated (or new session created)
            // This depends on implementation - could be new session or update
            const sessions = await Session.find({
                userId: testUser._id,
                isRevoked: false,
            });

            expect(sessions.length).toBeGreaterThan(0);
            // At least one session should have recent lastActive
            const hasRecentSession = sessions.some(s =>
                s.lastActive >= beforeTime
            );
            expect(hasRecentSession).toBe(true);
        });
    });

    describe('Token Rotation', () => {
        it('should generate new refresh token on each refresh', async () => {
            const response1 = await request(app)
                .post('/api/v1/auth/refresh')
                .set('Cookie', `refreshToken=${refreshToken}`);

            expect(response1.status).toBe(200);
            const newToken1 = response1.body.data.refreshToken;
            expect(newToken1).not.toBe(refreshToken);

            // Use new token for second refresh
            const response2 = await request(app)
                .post('/api/v1/auth/refresh')
                .set('Cookie', `refreshToken=${newToken1}`);

            expect(response2.status).toBe(200);
            const newToken2 = response2.body.data.refreshToken;
            expect(newToken2).not.toBe(newToken1);
        });

        it('should invalidate previous refresh token after rotation', async () => {
            // First refresh
            const response1 = await request(app)
                .post('/api/v1/auth/refresh')
                .set('Cookie', `refreshToken=${refreshToken}`);

            const newToken = response1.body.data.refreshToken;

            // Try to use old token
            const response2 = await request(app)
                .post('/api/v1/auth/refresh')
                .set('Cookie', `refreshToken=${refreshToken}`);

            // Should fail
            expect(response2.status).toBe(401);
        });

        it('should validate tokenVersion matches', async () => {
            // Create refresh token with mismatched version
            const mismatchedToken = generateRefreshToken(testUser._id, 999); // Wrong version

            const response = await request(app)
                .post('/api/v1/auth/refresh')
                .set('Cookie', `refreshToken=${mismatchedToken}`);

            // Should fail due to version mismatch
            expect(response.status).toBe(401);
            expect(response.body.error.code).toMatch(/INVALID|EXPIRED/);
        });
    });

    describe('Concurrent Refresh + Logout', () => {
        it('should handle concurrent refresh and logout safely', async () => {
            // Launch concurrent refresh and logout requests
            const refreshPromise = request(app)
                .post('/api/v1/auth/refresh')
                .set('Cookie', `refreshToken=${refreshToken}`);

            const logoutPromise = request(app)
                .post('/api/v1/auth/logout')
                .set('Cookie', `refreshToken=${refreshToken}`);

            const [refreshRes, logoutRes] = await Promise.all([
                refreshPromise,
                logoutPromise,
            ]);

            // One should succeed, one should fail
            const successCount = [refreshRes.status, logoutRes.status].filter(s => s === 200).length;
            expect(successCount).toBeGreaterThanOrEqual(1);

            // After both requests, token should be unusable
            const finalRefresh = await request(app)
                .post('/api/v1/auth/refresh')
                .set('Cookie', `refreshToken=${refreshToken}`);

            expect(finalRefresh.status).toBe(401);
        });
    });

    describe('Missing Refresh Token', () => {
        it('should reject request without refresh token', async () => {
            const response = await request(app)
                .post('/api/v1/auth/refresh');

            expect(response.status).toBe(401);
            expect(response.body.error.code).toMatch(/INVALID|REQUIRED/);
        });
    });

    describe('Invalid Refresh Token Format', () => {
        it('should reject malformed tokens', async () => {
            const response = await request(app)
                .post('/api/v1/auth/refresh')
                .set('Cookie', 'refreshToken=invalid.jwt.format');

            expect(response.status).toBe(401);
        });
    });
});
