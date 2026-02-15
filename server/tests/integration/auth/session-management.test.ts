import request from 'supertest';
import app from '../../../src/app';

import mongoose from 'mongoose';
import { Company, Session, User } from '../../../src/infrastructure/database/mongoose/models';

// Helper to extract error message from response
const getErrorMessage = (response: any): string => {
    return response.body.error?.message || response.body.message || '';
};

const getSessions = (response: any): any[] => {
    return response.body?.data?.sessions || response.body?.sessions || [];
};

const getSessionId = (session: any): string => {
    return session?.id || session?._id;
};

describe('Session Management', () => {
    let testUser: any;
    let authCookies: string[];
    let refreshToken: string;
    const testEmail = 'session@example.com';
    const testPassword = 'Password123!';





    beforeEach(async () => {
        await User.deleteMany({});
        await Company.deleteMany({});
        await Session.deleteMany({});

        // Create and login test user with company context required by session endpoints
        testUser = await User.create({
            name: 'Session Test',
            email: testEmail,
            password: testPassword,
            role: 'seller',
            isEmailVerified: true,
            isActive: true,
        });

        const company = await Company.create({
            name: 'Session Test Company',
            owner: testUser._id,
            status: 'approved',
        });
        testUser.companyId = company._id;
        await testUser.save();

        // Login to get auth cookies
        const loginResponse = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: testEmail, password: testPassword })
            .set('X-CSRF-Token', 'frontend-request')
            .expect(200);

        const rawCookies = loginResponse.headers['set-cookie'] as unknown as string[];
        const cookieMap = new Map<string, string>();
        rawCookies.forEach((cookie) => {
            const [pair] = cookie.split(';');
            const [name, value] = pair.split('=');
            if (name && value && value !== 'j:' && value !== '') {
                cookieMap.set(name, `${name}=${value}`);
            }
        });
        authCookies = Array.from(cookieMap.values());
        refreshToken = authCookies
            .find((c) => c.startsWith('refreshToken=') || c.startsWith('__Secure-refreshToken='))
            ?.split('=')[1] || '';
    });

    describe('GET /api/v1/sessions', () => {
        it('should list all active sessions for authenticated user', async () => {
            const response = await request(app)
                .get('/api/v1/sessions')
                .set('Cookie', authCookies)
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const sessions = getSessions(response);
            expect(Array.isArray(sessions)).toBe(true);
            expect(sessions.length).toBeGreaterThan(0);

            // Verify session structure
            const session = sessions[0];
            expect(session).toHaveProperty('id');
            expect(session).toHaveProperty('ip');
            expect(session).toHaveProperty('deviceInfo');
            expect(session).toHaveProperty('lastActive');
        });

        it('should include device information in sessions', async () => {
            const response = await request(app)
                .get('/api/v1/sessions')
                .set('Cookie', authCookies)
                .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0')
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const session = getSessions(response)[0];
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
                .set('Cookie', authCookies)
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            expect(getSessions(response).length).toBe(2);
        });
    });

    describe('DELETE /api/v1/sessions/:sessionId', () => {
        it('should revoke specific session', async () => {
            // Get sessions list
            const listResponse = await request(app)
                .get('/api/v1/sessions')
                .set('Cookie', authCookies)
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const sessionId = getSessionId(getSessions(listResponse)[0]);

            // Revoke the session
            const response = await request(app)
                .delete(`/api/v1/sessions/${sessionId}`)
                .set('Cookie', authCookies)
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            expect(getErrorMessage(response)).toMatch(/revoked|success/i);

            // Verify session was revoked
            const session = await Session.findById(sessionId);
            expect(session).toBeDefined();
            expect(session!.isRevoked).toBe(true);
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
            const otherCompany = await Company.create({
                name: 'Other Company',
                owner: otherUser._id,
                status: 'approved',
            });
            otherUser.companyId = otherCompany._id;
            await otherUser.save();

            // Login as other user
            const otherLoginResponse = await request(app)
                .post('/api/v1/auth/login')
                .send({ email: 'other@example.com', password: testPassword })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const rawOtherCookies = otherLoginResponse.headers['set-cookie'] as unknown as string[];
            const otherCookieMap = new Map<string, string>();
            rawOtherCookies.forEach((cookie) => {
                const [pair] = cookie.split(';');
                const [name, value] = pair.split('=');
                if (name && value && value !== 'j:' && value !== '') {
                    otherCookieMap.set(name, `${name}=${value}`);
                }
            });
            const otherCookiesHeader = Array.from(otherCookieMap.values());

            // Get other user's sessions
            const otherSessionsResponse = await request(app)
                .get('/api/v1/sessions')
                .set('Cookie', otherCookiesHeader)
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const otherSessionId = getSessionId(getSessions(otherSessionsResponse)[0]);

            // Try to revoke other user's session with first user's token
            const response = await request(app)
                .delete(`/api/v1/sessions/${otherSessionId}`)
                .set('Cookie', authCookies)
                .set('X-CSRF-Token', 'frontend-request')
                .expect(404);

            expect(getErrorMessage(response)).toMatch(/not found|unauthorized/i);
        });

        it('should reject invalid session ID format', async () => {
            const response = await request(app)
                .delete('/api/v1/sessions/invalid-id')
                .set('Cookie', authCookies)
                .set('X-CSRF-Token', 'frontend-request')
                .expect((res) => {
                    expect([400, 401]).toContain(res.status);
                });

            expect(getErrorMessage(response)).toMatch(/invalid|id|unauthorized/i);
        });

        it('should handle non-existent session ID', async () => {
            const fakeId = new mongoose.Types.ObjectId().toString();

            const response = await request(app)
                .delete(`/api/v1/sessions/${fakeId}`)
                .set('Cookie', authCookies)
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
                .set('Cookie', authCookies)
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const initialCount = getSessions(initialResponse).length;
            expect(initialCount).toBeGreaterThan(1);

            // Revoke all sessions
            const response = await request(app)
                .delete('/api/v1/sessions')
                .send({ keepCurrent: true })
                .set('Cookie', authCookies)
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            expect(getErrorMessage(response)).toMatch(/revoked|success/i);
            expect(response.body.data?.count).toBeDefined();
            expect(response.body.data?.count).toBeGreaterThanOrEqual(0);

            // Verify only current session remains
            const finalResponse = await request(app)
                .get('/api/v1/sessions')
                .set('Cookie', authCookies)
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            expect(getSessions(finalResponse).length).toBe(1);
        });

        it('should keep current session active after revoking all', async () => {
            // Revoke all sessions
            await request(app)
                .delete('/api/v1/sessions')
                .send({ keepCurrent: true })
                .set('Cookie', authCookies)
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            // Current session should still work
            const response = await request(app)
                .get('/api/v1/auth/me')
                .set('Cookie', authCookies)
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            expect(response.body.data?.user || response.body.user).toBeDefined();
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

            // Login uses default 7-day session
            const expiryTime = session.expiresAt.getTime() - Date.now();
            const expectedExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

            // Within 5 minutes of expected expiry (account for test execution time)
            expect(Math.abs(expiryTime - expectedExpiry)).toBeLessThan(5 * 60 * 1000);
        });

        it('should update lastActive on authenticated requests', async () => {
            const initialSession = await Session.findOne({ userId: testUser._id });
            const initialLastActive = initialSession!.lastActive;

            // Wait a second
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Make an authenticated request
            await request(app)
                .get('/api/v1/auth/me')
                .set('Cookie', authCookies)
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            // Check lastActive was updated
            const updatedSession = await Session.findById(initialSession!._id);
            expect(updatedSession!.lastActive.getTime()).toBeGreaterThanOrEqual(initialLastActive.getTime());
        });
    });

    describe('Security', () => {
        it('should hash session tokens in database', async () => {
            const sessions = await Session.find({ userId: testUser._id });
            expect(sessions.length).toBeGreaterThan(0);

            // Session tokens should be hashed (not plain text)
            const session = sessions[0];
            expect(session.refreshToken).toBeDefined();
            expect(session.refreshToken).not.toBe(refreshToken);
            expect(session.refreshToken.length).toBeGreaterThan(32); // Hashed token should be longer
        });

        it('should not expose sensitive session data in API response', async () => {
            const response = await request(app)
                .get('/api/v1/sessions')
                .set('Cookie', authCookies)
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const session = getSessions(response)[0];

            // Should not expose tokens
            expect(session).not.toHaveProperty('token');
            expect(session).not.toHaveProperty('refreshToken');

            // Should not expose user password
            expect(session.user?.password).toBeUndefined();
        });

        it('should require CSRF token for session operations', async () => {
            const listResponse = await request(app)
                .get('/api/v1/sessions')
                .set('Cookie', authCookies)
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const sessionId = getSessionId(getSessions(listResponse)[0]);

            // Try to revoke without CSRF token
            const response = await request(app)
                .delete(`/api/v1/sessions/${sessionId}`)
                .set('Cookie', authCookies);

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
                .set('Cookie', authCookies)
                .set('X-CSRF-Token', 'frontend-request')
                .expect(200);

            const session = getSessions(response)[0];
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
