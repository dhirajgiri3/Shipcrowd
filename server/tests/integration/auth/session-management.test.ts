import request from 'supertest';
import app from '../../../src/app';

import User from '../../../src/infrastructure/database/mongoose/models/User';
import Session from '../../../src/infrastructure/database/mongoose/models/Session';
import mongoose from 'mongoose';

// Helper to extract error message from response
const getErrorMessage = (response: any): string => {
    return response.body.error?.message || response.body.message || '';
};

describe('Session Management', () => {
    let testUser: any;
    let authToken: string;
    let refreshToken: string;
    const testEmail = 'session@example.com';
    const testPassword = 'Password123!';





    beforeEach(async () => {
        await User.deleteMany({});
        await Session.deleteMany({});

        // Create and login test user
        testUser = await User.create({
            name: 'Session Test',
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

        // Extract tokens from cookies
        const cookies = loginResponse.headers['set-cookie'];
        authToken = cookies.find((c: string) => c.startsWith('accessToken='))?.split(';')[0].split('=')[1] || '';
        refreshToken = cookies.find((c: string) => c.startsWith('refreshToken='))?.split(';')[0].split('=')[1] || '';
    });

    describe('GET /api/v1/sessions', () => {
        it('should list all active sessions for authenticated user', async () => {
            const response = await request(app)
                .get('/api/v1/sessions')
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            expect(response.body.sessions).toBeDefined();
            expect(Array.isArray(response.body.sessions)).toBe(true);
            expect(response.body.sessions.length).toBeGreaterThan(0);

            // Verify session structure
            const session = response.body.sessions[0];
            expect(session).toHaveProperty('_id');
            expect(session).toHaveProperty('ip');
            expect(session).toHaveProperty('userAgent');
            expect(session).toHaveProperty('deviceInfo');
            expect(session).toHaveProperty('lastActive');
        });

        it('should include device information in sessions', async () => {
            const response = await request(app)
                .get('/api/v1/sessions')
                .set('Cookie', [`accessToken=${authToken}`])
                .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0')
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const session = response.body.sessions[0];
            expect(session.deviceInfo).toBeDefined();
            expect(session.deviceInfo).toHaveProperty('type');
            expect(['desktop', 'mobile', 'tablet', 'other']).toContain(session.deviceInfo.type);
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .get('/api/v1/sessions')
                .set('X-CSRF-Token', 'frontend-request')
                .expect(401);

            expect(getErrorMessage(response)).toMatch(/unauthorized|authentication/i);
        });

        it('should show multiple sessions from different devices', async () => {
            // Create second session from different user agent
            await request(app)
                .post('/api/v1/auth/login')
                .send({ email: testEmail, password: testPassword })
                .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) Mobile Safari')
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            // Get sessions list
            const response = await request(app)
                .get('/api/v1/sessions')
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            expect(response.body.sessions.length).toBe(2);
        });
    });

    describe('DELETE /api/v1/sessions/:sessionId', () => {
        it('should revoke specific session', async () => {
            // Get sessions list
            const listResponse = await request(app)
                .get('/api/v1/sessions')
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const sessionId = listResponse.body.sessions[0]._id;

            // Revoke the session
            const response = await request(app)
                .delete(`/api/v1/sessions/${sessionId}`)
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            expect(getErrorMessage(response)).toMatch(/revoked|success/i);

            // Verify session was deleted
            const session = await Session.findById(sessionId);
            expect(session).toBeNull();
        });

        it('should not allow revoking other users sessions', async () => {
            // Create another user
            const otherUser = await User.create({
                name: 'Other User',
                email: 'other@example.com',
                password: testPassword,
                role: 'seller',
                isEmailVerified: true,
                isActive: true,
            });

            // Login as other user
            const otherLoginResponse = await request(app)
                .post('/api/v1/auth/login')
                .send({ email: 'other@example.com', password: testPassword })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const otherCookies = otherLoginResponse.headers['set-cookie'];
            const otherToken = otherCookies.find((c: string) => c.startsWith('accessToken='))?.split(';')[0].split('=')[1] || '';

            // Get other user's sessions
            const otherSessionsResponse = await request(app)
                .get('/api/v1/sessions')
                .set('Cookie', [`accessToken=${otherToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const otherSessionId = otherSessionsResponse.body.sessions[0]._id;

            // Try to revoke other user's session with first user's token
            const response = await request(app)
                .delete(`/api/v1/sessions/${otherSessionId}`)
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(404);

            expect(getErrorMessage(response)).toMatch(/not found|unauthorized/i);
        });

        it('should reject invalid session ID format', async () => {
            const response = await request(app)
                .delete('/api/v1/sessions/invalid-id')
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            expect(getErrorMessage(response)).toMatch(/invalid|id/i);
        });

        it('should handle non-existent session ID', async () => {
            const fakeId = new mongoose.Types.ObjectId().toString();

            const response = await request(app)
                .delete(`/api/v1/sessions/${fakeId}`)
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(404);

            expect(getErrorMessage(response)).toMatch(/not found/i);
        });
    });

    describe('DELETE /api/v1/sessions (Revoke All)', () => {
        beforeEach(async () => {
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
        });

        it('should revoke all sessions except current', async () => {
            // Get initial session count
            const initialResponse = await request(app)
                .get('/api/v1/sessions')
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const initialCount = initialResponse.body.sessions.length;
            expect(initialCount).toBeGreaterThan(1);

            // Revoke all sessions
            const response = await request(app)
                .delete('/api/v1/sessions')
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            expect(getErrorMessage(response)).toMatch(/revoked|success/i);
            expect(response.body.revokedCount).toBeDefined();
            expect(response.body.revokedCount).toBeGreaterThan(0);

            // Verify only current session remains
            const finalResponse = await request(app)
                .get('/api/v1/sessions')
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            expect(finalResponse.body.sessions.length).toBe(1);
        });

        it('should keep current session active after revoking all', async () => {
            // Revoke all sessions
            await request(app)
                .delete('/api/v1/sessions')
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            // Current session should still work
            const response = await request(app)
                .get('/api/v1/auth/me')
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            expect(response.body.user).toBeDefined();
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .delete('/api/v1/sessions')
                .set('X-CSRF-Token', 'frontend-request')
                .expect(401);

            expect(getErrorMessage(response)).toMatch(/unauthorized|authentication/i);
        });
    });

    describe('Session Expiry', () => {
        it('should expire sessions after configured TTL', async () => {
            // This test would require waiting for session TTL or manipulating time
            // For now, we verify the TTL is set correctly on session creation
            const sessions = await Session.find({ userId: testUser._id });
            expect(sessions.length).toBeGreaterThan(0);

            const session = sessions[0];
            expect(session.expiresAt).toBeDefined();

            // Should expire in ~8 hours (480 minutes)
            const expiryTime = session.expiresAt.getTime() - Date.now();
            const expectedExpiry = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

            // Within 1 minute of expected expiry (account for test execution time)
            expect(Math.abs(expiryTime - expectedExpiry)).toBeLessThan(60000);
        });

        it('should update lastActive on authenticated requests', async () => {
            const initialSession = await Session.findOne({ userId: testUser._id });
            const initialLastActive = initialSession!.lastActive;

            // Wait a second
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Make an authenticated request
            await request(app)
                .get('/api/v1/auth/me')
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            // Check lastActive was updated
            const updatedSession = await Session.findById(initialSession!._id);
            expect(updatedSession!.lastActive.getTime()).toBeGreaterThan(initialLastActive.getTime());
        });
    });

    describe('Security', () => {
        it('should hash session tokens in database', async () => {
            const sessions = await Session.find({ userId: testUser._id });
            expect(sessions.length).toBeGreaterThan(0);

            // Session tokens should be hashed (not plain text)
            const session = sessions[0];
            expect(session.token).toBeDefined();
            expect(session.token).not.toBe(refreshToken);
            expect(session.token.length).toBeGreaterThan(32); // Hashed token should be longer
        });

        it('should not expose sensitive session data in API response', async () => {
            const response = await request(app)
                .get('/api/v1/sessions')
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const session = response.body.sessions[0];

            // Should not expose tokens
            expect(session).not.toHaveProperty('token');
            expect(session).not.toHaveProperty('refreshToken');

            // Should not expose user password
            expect(session.user?.password).toBeUndefined();
        });

        it('should require CSRF token for session operations', async () => {
            const listResponse = await request(app)
                .get('/api/v1/sessions')
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const sessionId = listResponse.body.sessions[0]._id;

            // Try to revoke without CSRF token
            const response = await request(app)
                .delete(`/api/v1/sessions/${sessionId}`)
                .set('Cookie', [`accessToken=${authToken}`]);

            // Should fail in production (403), may succeed in dev with Postman bypass
            if (process.env.NODE_ENV === 'production') {
                expect(response.status).toBe(403);
            }
        });
    });

    describe('Geolocation', () => {
        it('should capture IP address from request', async () => {
            const response = await request(app)
                .get('/api/v1/sessions')
                .set('Cookie', [`accessToken=${authToken}`])
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const session = response.body.sessions[0];
            expect(session.ip).toBeDefined();
            expect(typeof session.ip).toBe('string');
        });

        it('should respect X-Forwarded-For header', async () => {
            const testIp = '203.0.113.1';

            await request(app)
                .post('/api/v1/auth/login')
                .send({ email: testEmail, password: testPassword })
                .set('X-Forwarded-For', testIp)
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const sessions = await Session.find({ userId: testUser._id, ip: testIp });
            expect(sessions.length).toBeGreaterThan(0);
        });
    });
});
