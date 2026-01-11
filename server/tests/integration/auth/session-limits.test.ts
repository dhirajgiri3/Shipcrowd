import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../src/app';
import { User } from '../../../src/infrastructure/database/mongoose/models';
import { Company } from '../../../src/infrastructure/database/mongoose/models';
import { Session } from '../../../src/infrastructure/database/mongoose/models';
import { generateToken } from '../../../src/core/application/services/auth/token.service';

describe('Session Limit Enforcement', () => {
    let user: any;
    let company: any;

    beforeAll(async () => {
        // Connect to test database
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/shipcrowd-test');
        }
    });

    beforeEach(async () => {
        // Clear relevant collections
        await User.deleteMany({});
        await Company.deleteMany({});
        await Session.deleteMany({});

        // Create test user
        user = await User.create({
            email: 'session-test@example.com',
            password: 'SecurePass123!',
            name: 'Session Test User',
            role: 'seller',
            isEmailVerified: true,
            kycStatus: {
                isComplete: true,
                lastUpdated: new Date()
            }
        });

        company = await Company.create({
            name: 'Session Test Company',
            owner: user._id,
            status: 'approved' // ✅ Fixed: Use valid enum value from Company model
        });

        user.companyId = company._id;
        await user.save();
    });

    afterAll(async () => {
        await User.deleteMany({});
        await Company.deleteMany({});
        await Session.deleteMany({});
        await mongoose.connection.close();
    });

    describe('Desktop Session Limits', () => {
        it('should enforce desktop session limit (max 1)', async () => {
            // Login from Desktop 1
            const response1 = await request(app)
                .post('/api/v1/auth/login')
                .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
                .send({
                    email: 'session-test@example.com',
                    password: 'SecurePass123!'
                })
                .expect(200);

            const token1 = response1.body.data.accessToken;

            // Verify Desktop 1 session works
            await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            // Login from Desktop 2
            const response2 = await request(app)
                .post('/api/v1/auth/login')
                .set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
                .send({
                    email: 'session-test@example.com',
                    password: 'SecurePass123!'
                })
                .expect(200);

            const token2 = response2.body.data.accessToken;

            // Verify Desktop 2 session works
            await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${token2}`)
                .expect(200);

            // Desktop 1 session should be revoked
            const response = await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${token1}`)
                .expect(401);

            expect(response.body.code).toBe('SESSION_REVOKED');
        });

        it('should allow only 1 active desktop session at a time', async () => {
            // Create 3 desktop sessions
            const tokens: string[] = [];

            for (let i = 0; i < 3; i++) {
                const response = await request(app)
                    .post('/api/v1/auth/login')
                    .set('User-Agent', `Mozilla/5.0 (Windows NT 10.0; Win64; x64) Desktop${i}`)
                    .send({
                        email: 'session-test@example.com',
                        password: 'SecurePass123!'
                    })
                    .expect(200);

                tokens.push(response.body.data.accessToken);
            }

            // Only the last token should work
            await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${tokens[2]}`)
                .expect(200);

            // Previous tokens should be revoked
            await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${tokens[0]}`)
                .expect(401);

            await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${tokens[1]}`)
                .expect(401);

            // Verify only 1 active desktop session exists
            const activeSessions = await Session.find({
                userId: user._id,
                isRevoked: false,
                'deviceInfo.type': 'desktop'
            });

            expect(activeSessions.length).toBe(1);
        });
    });

    describe('Mobile Session Limits', () => {
        it('should allow up to 2 mobile sessions', async () => {
            const tokens: string[] = [];

            // Create 2 mobile sessions
            for (let i = 0; i < 2; i++) {
                const response = await request(app)
                    .post('/api/v1/auth/login')
                    .set('User-Agent', `Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) Mobile${i}`)
                    .send({
                        email: 'session-test@example.com',
                        password: 'SecurePass123!'
                    })
                    .expect(200);

                tokens.push(response.body.data.accessToken);
            }

            // Both tokens should work
            await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${tokens[0]}`)
                .expect(200);

            await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${tokens[1]}`)
                .expect(200);

            // Verify 2 active mobile sessions exist
            const activeSessions = await Session.find({
                userId: user._id,
                isRevoked: false,
                $or: [
                    { 'deviceInfo.type': 'mobile' },
                    { 'deviceInfo.type': 'tablet' }
                ]
            });

            expect(activeSessions.length).toBe(2);
        });

        it('should revoke oldest mobile session when limit exceeded', async () => {
            const tokens: string[] = [];

            // Create 3 mobile sessions (exceeds limit of 2)
            for (let i = 0; i < 3; i++) {
                const response = await request(app)
                    .post('/api/v1/auth/login')
                    .set('User-Agent', `Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) Mobile${i}`)
                    .send({
                        email: 'session-test@example.com',
                        password: 'SecurePass123!'
                    })
                    .expect(200);

                tokens.push(response.body.data.accessToken);
            }

            // First token should be revoked
            await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${tokens[0]}`)
                .expect(401);

            // Last 2 tokens should work
            await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${tokens[1]}`)
                .expect(200);

            await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${tokens[2]}`)
                .expect(200);
        });

        it('should treat tablet sessions same as mobile', async () => {
            // Create 1 mobile + 1 tablet session
            const mobileResponse = await request(app)
                .post('/api/v1/auth/login')
                .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)')
                .send({
                    email: 'session-test@example.com',
                    password: 'SecurePass123!'
                })
                .expect(200);

            const tabletResponse = await request(app)
                .post('/api/v1/auth/login')
                .set('User-Agent', 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)')
                .send({
                    email: 'session-test@example.com',
                    password: 'SecurePass123!'
                })
                .expect(200);

            // Both should work
            await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${mobileResponse.body.data.accessToken}`)
                .expect(200);

            await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${tabletResponse.body.data.accessToken}`)
                .expect(200);

            // Create another mobile session (should revoke first mobile)
            const mobile2Response = await request(app)
                .post('/api/v1/auth/login')
                .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)')
                .send({
                    email: 'session-test@example.com',
                    password: 'SecurePass123!'
                })
                .expect(200);

            // First mobile should be revoked
            await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${mobileResponse.body.data.accessToken}`)
                .expect(401);

            // Tablet and new mobile should work
            await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${tabletResponse.body.data.accessToken}`)
                .expect(200);

            await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${mobile2Response.body.data.accessToken}`)
                .expect(200);
        });
    });

    describe('Mixed Device Sessions', () => {
        it('should allow 1 desktop + 2 mobile sessions simultaneously', async () => {
            const tokens: { [key: string]: string } = {};

            // Create desktop session
            const desktopResponse = await request(app)
                .post('/api/v1/auth/login')
                .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
                .send({
                    email: 'session-test@example.com',
                    password: 'SecurePass123!'
                })
                .expect(200);

            tokens.desktop = desktopResponse.body.data.accessToken;

            // Create 2 mobile sessions
            for (let i = 0; i < 2; i++) {
                const response = await request(app)
                    .post('/api/v1/auth/login')
                    .set('User-Agent', `Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) Mobile${i}`)
                    .send({
                        email: 'session-test@example.com',
                        password: 'SecurePass123!'
                    })
                    .expect(200);

                tokens[`mobile${i}`] = response.body.data.accessToken;
            }

            // All 3 sessions should work
            await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${tokens.desktop}`)
                .expect(200);

            await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${tokens.mobile0}`)
                .expect(200);

            await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${tokens.mobile1}`)
                .expect(200);

            // Verify session counts
            const desktopSessions = await Session.find({
                userId: user._id,
                isRevoked: false,
                'deviceInfo.type': 'desktop'
            });

            const mobileSessions = await Session.find({
                userId: user._id,
                isRevoked: false,
                $or: [
                    { 'deviceInfo.type': 'mobile' },
                    { 'deviceInfo.type': 'tablet' }
                ]
            });

            expect(desktopSessions.length).toBe(1);
            expect(mobileSessions.length).toBe(2);
        });

        it('should not affect mobile sessions when desktop limit is reached', async () => {
            // Create 2 mobile sessions
            const mobile1 = await request(app)
                .post('/api/v1/auth/login')
                .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)')
                .send({
                    email: 'session-test@example.com',
                    password: 'SecurePass123!'
                })
                .expect(200);

            const mobile2 = await request(app)
                .post('/api/v1/auth/login')
                .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)')
                .send({
                    email: 'session-test@example.com',
                    password: 'SecurePass123!'
                })
                .expect(200);

            // Create 2 desktop sessions (should revoke first)
            const desktop1 = await request(app)
                .post('/api/v1/auth/login')
                .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
                .send({
                    email: 'session-test@example.com',
                    password: 'SecurePass123!'
                })
                .expect(200);

            const desktop2 = await request(app)
                .post('/api/v1/auth/login')
                .set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')
                .send({
                    email: 'session-test@example.com',
                    password: 'SecurePass123!'
                })
                .expect(200);

            // Mobile sessions should still work
            await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${mobile1.body.data.accessToken}`)
                .expect(200);

            await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${mobile2.body.data.accessToken}`)
                .expect(200);

            // First desktop should be revoked
            await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${desktop1.body.data.accessToken}`)
                .expect(401);

            // Second desktop should work
            await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${desktop2.body.data.accessToken}`)
                .expect(200);
        });
    });

    describe('Global Session Limit', () => {
        it('should enforce global session limit across all device types', async () => {
            // Assuming MAX_CONCURRENT_SESSIONS = 5 (1 desktop + 2 mobile + 2 buffer)
            const tokens: string[] = [];

            // Create sessions beyond global limit
            const userAgents = [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',  // Desktop
                'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',  // Mobile 1
                'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',  // Mobile 2
                'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',  // Tablet (counts as mobile)
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',  // Desktop 2
                'Mozilla/5.0 (Android 11; Mobile)',  // Mobile 3
            ];

            for (const ua of userAgents) {
                const response = await request(app)
                    .post('/api/v1/auth/login')
                    .set('User-Agent', ua)
                    .send({
                        email: 'session-test@example.com',
                        password: 'SecurePass123!'
                    })
                    .expect(200);

                tokens.push(response.body.data.accessToken);
            }

            // Verify total active sessions doesn't exceed global limit
            const activeSessions = await Session.find({
                userId: user._id,
                isRevoked: false
            });

            expect(activeSessions.length).toBeLessThanOrEqual(5);
        });
    });
});
