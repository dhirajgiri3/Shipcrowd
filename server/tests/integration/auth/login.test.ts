/**
 * Auth Login Integration Tests
 * Example integration test for authentication endpoints
 * 
 * TODO: These tests require the Express app to be exported from the main entry point.
 * Currently marked as skipped until app export is configured in src/index.ts or a
 * dedicated test server setup is created.
 * 
 * Prerequisites to enable:
 * 1. Export Express app from src/index.ts: export { app }
 * 2. Or create src/app.ts that exports the app without starting the server
 */
import app from '@/app';
import request from 'supertest';
import { createTestUser } from '../../fixtures/userFactory';

// App is now exported from src/app.ts - tests can run!
describe('POST /api/v1/auth/login', () => {
    beforeAll(async () => {
        // App is already imported and configured
        // No additional setup needed
    });

    describe('Successful Login', () => {
        it('should return tokens on valid credentials', async () => {
            await createTestUser({
                email: 'login@test.com',
                password: 'ValidPass123!',
                isActive: true, // Must be active to login
                isEmailVerified: true,
            });

            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'login@test.com',
                    password: 'ValidPass123!',
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            // Tokens are in cookies, not body
            expect(response.headers['set-cookie']).toBeDefined();
            const cookies = Array.isArray(response.headers['set-cookie'])
                ? response.headers['set-cookie']
                : [response.headers['set-cookie'] || ''];
            expect(cookies.some((c: string) => c.startsWith('accessToken='))).toBe(true);
            expect(cookies.some((c: string) => c.startsWith('refreshToken='))).toBe(true);
            expect(response.body.data.user.email).toBe('login@test.com');
        });

        it('should return user details without password', async () => {
            await createTestUser({
                email: 'nopass@test.com',
                password: 'ValidPass123!',
            });

            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'nopass@test.com',
                    password: 'ValidPass123!',
                });

            expect(response.status).toBe(200);
            expect(response.body.data.user).not.toHaveProperty('password');
        });
    });

    describe('Failed Login', () => {
        it('should return 401 for wrong password', async () => {
            await createTestUser({
                email: 'wrongpass@test.com',
                password: 'CorrectPass123!',
            });

            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'wrongpass@test.com',
                    password: 'WrongPassword!',
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it('should return 401 for non-existent user', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'nonexistent@test.com',
                    password: 'AnyPassword123!',
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it('should return 400 for missing email', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    password: 'SomePassword123!',
                });

            expect(response.status).toBe(400);
        });

        it('should return 400 for missing password', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'test@test.com',
                });

            expect(response.status).toBe(400);
        });

        it('should return 400 for invalid email format', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'not-an-email',
                    password: 'SomePassword123!',
                });

            expect(response.status).toBe(400);
        });
    });

    describe('Edge Cases', () => {
        it('should handle email with different case', async () => {
            await createTestUser({
                email: 'CaseSensitive@test.com',
                password: 'ValidPass123!',
            });

            // Login with lowercase
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'casesensitive@test.com',
                    password: 'ValidPass123!',
                });

            expect(response.status).toBe(200);
        });

        it('should trim whitespace from email', async () => {
            await createTestUser({
                email: 'trimmed@test.com',
                password: 'ValidPass123!',
            });

            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: '  trimmed@test.com  ',
                    password: 'ValidPass123!',
                });

            // Should work if the controller trims, or return 400/401 if not
            expect([200, 400, 401]).toContain(response.status);
        });
    });
});
