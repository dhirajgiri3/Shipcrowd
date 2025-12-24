/**
 * Integration tests for authentication endpoints
 */

import request from 'supertest';
import express, { Express } from 'express';
import { connectTestDb, closeTestDb, clearTestDb } from '../utils/testSetup';
import v1Routes from '../../presentation/http/routes/v1';
import cookieParser from 'cookie-parser';

describe('Authentication API', () => {
    let app: Express;

    beforeAll(async () => {
        await connectTestDb();

        // Setup Express app for testing
        app = express();
        app.use(express.json());
        app.use(cookieParser());
        app.use('/api/v1', v1Routes);
    });

    afterAll(async () => {
        await closeTestDb();
    });

    afterEach(async () => {
        await clearTestDb();
    });

    describe('POST /api/v1/auth/register', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'Test1234!',
                name: 'Test User',
            };

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(userData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('user');
            expect(response.body.data.user.email).toBe(userData.email);
            expect(response.body.data).toHaveProperty('accessToken');
            expect(response.body.data).toHaveProperty('refreshToken');
        });

        it('should fail with invalid email', async () => {
            const userData = {
                email: 'invalid-email',
                password: 'Test1234!',
                name: 'Test User',
            };

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should fail with weak password', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'weak',
                name: 'Test User',
            };

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should fail with duplicate email', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'Test1234!',
                name: 'Test User',
            };

            // First registration
            await request(app)
                .post('/api/v1/auth/register')
                .send(userData)
                .expect(201);

            // Duplicate registration
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(userData)
                .expect(409);

            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/v1/auth/login', () => {
        beforeEach(async () => {
            // Create a test user
            await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'test@example.com',
                    password: 'Test1234!',
                    name: 'Test User',
                });
        });

        it('should login successfully with valid credentials', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'Test1234!',
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('user');
            expect(response.body.data).toHaveProperty('accessToken');
            expect(response.body.data).toHaveProperty('refreshToken');
        });

        it('should fail with incorrect password', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'WrongPassword123!',
                })
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should fail with non-existent email', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'Test1234!',
                })
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/v1/auth/refresh', () => {
        let refreshToken: string;

        beforeEach(async () => {
            // Register and get refresh token
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'test@example.com',
                    password: 'Test1234!',
                    name: 'Test User',
                });

            refreshToken = response.body.data.refreshToken;
        });

        it('should refresh access token successfully', async () => {
            const response = await request(app)
                .post('/api/v1/auth/refresh')
                .send({ refreshToken })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('accessToken');
        });

        it('should fail with invalid refresh token', async () => {
            const response = await request(app)
                .post('/api/v1/auth/refresh')
                .send({ refreshToken: 'invalid-token' })
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });
});
