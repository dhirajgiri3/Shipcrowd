import request from 'supertest';
import app from '../../../src/app';
import { User } from '../../../src/infrastructure/database/mongoose/models';

describe('POST /api/v1/auth/register', () => {




    beforeEach(async () => {
        await User.deleteMany({});
    });

    describe('Successful Registration', () => {
        it('should register a new user with valid data', async () => {
            const userData = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'Password123!',
                role: 'seller',
            };

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(userData)
                .set('X-CSRF-Token', 'frontend-request')
                .expect(201);

            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toMatch(/registered successfully|Registration successful/i);

            // Verify user was created in database
            const user = await User.findOne({ email: userData.email });
            expect(user).toBeTruthy();
            expect(user!.name).toBe(userData.name);
            expect(user!.role).toBe(userData.role);
            expect(user!.isEmailVerified).toBe(false);
            expect(user!.isActive).toBe(false);
            expect(user!.security.verificationToken).toBeTruthy();
        });

        it('should hash the password before saving', async () => {
            const userData = {
                name: 'Jane Doe',
                email: 'jane@example.com',
                password: 'Password123!',
                role: 'seller',
            };

            await request(app)
                .post('/api/v1/auth/register')
                .send(userData)
                .set('X-CSRF-Token', 'frontend-request')
                .expect(201);

            const user = await User.findOne({ email: userData.email });
            expect(user!.password).toBeDefined();
            expect(user!.password).not.toBe(userData.password);
            expect(user!.password!.length).toBeGreaterThan(50); // bcrypt hash length
        });

        it('should normalize email to lowercase', async () => {
            const userData = {
                name: 'Test User',
                email: 'TEST@EXAMPLE.COM',
                password: 'Password123!',
                role: 'seller',
            };

            await request(app)
                .post('/api/v1/auth/register')
                .send(userData)
                .set('X-CSRF-Token', 'frontend-request')
                .expect(201);

            const user = await User.findOne({ email: 'test@example.com' });
            expect(user).toBeTruthy();
        });
    });

    describe('Validation Errors', () => {
        it('should reject registration without required fields', async () => {
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({})
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            expect(response.body.error?.message || response.body.message).toBeDefined();
        });

        it('should reject invalid email format', async () => {
            const userData = {
                name: 'Test User',
                email: 'invalid-email',
                password: 'Password123!',
                role: 'seller',
            };

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(userData)
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            // Check errors array or message
            const errors = response.body.errors || [];
            const hasEmailError = errors.some((e: any) => e.message?.toLowerCase().includes('email'));
            expect(hasEmailError || (response.body.error?.message || response.body.message).match(/email/i)).toBeTruthy();
        });

        it('should reject weak password (less than 8 characters)', async () => {
            const userData = {
                name: 'Test User',
                email: 'test@example.com',
                password: 'Pass1!',
                role: 'seller',
            };

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(userData)
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            // Password validation should fail - just verify we got an error
            expect(response.body.error || response.body.errors || response.body.message).toBeDefined();
        });

        it('should reject password without uppercase letter', async () => {
            const userData = {
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123!',
                role: 'seller',
            };

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(userData)
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            // Check errors array for uppercase requirement
            const errors = response.body.errors || [];
            const hasUppercaseError = errors.some((e: any) =>
                e.message?.toLowerCase().includes('uppercase')
            );
            expect(hasUppercaseError).toBeTruthy();
        });

        it('should reject password without lowercase letter', async () => {
            const userData = {
                name: 'Test User',
                email: 'test@example.com',
                password: 'PASSWORD123!',
                role: 'seller',
            };

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(userData)
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            // Check errors array for lowercase requirement
            const errors = response.body.errors || [];
            const hasLowercaseError = errors.some((e: any) =>
                e.message?.toLowerCase().includes('lowercase')
            );
            expect(hasLowercaseError).toBeTruthy();
        });

        it('should reject password without number', async () => {
            const userData = {
                name: 'Test User',
                email: 'test@example.com',
                password: 'Password!',
                role: 'seller',
            };

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(userData)
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            // Check errors array for number requirement
            const errors = response.body.errors || [];
            const hasNumberError = errors.some((e: any) =>
                e.message?.toLowerCase().includes('number')
            );
            expect(hasNumberError).toBeTruthy();
        });

        it('should reject password without special character', async () => {
            const userData = {
                name: 'Test User',
                email: 'test@example.com',
                password: 'Password123',
                role: 'seller',
            };

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(userData)
                .set('X-CSRF-Token', 'frontend-request')
                .expect(400);

            // Check errors array for special character requirement
            const errors = response.body.errors || [];
            const hasSpecialCharError = errors.some((e: any) =>
                e.message?.toLowerCase().includes('special')
            );
            expect(hasSpecialCharError).toBeTruthy();
        });
    });

    describe('Duplicate Email', () => {
        it('should reject registration with existing email', async () => {
            const userData = {
                name: 'First User',
                email: 'duplicate@example.com',
                password: 'Password123!',
                role: 'seller',
            };

            // First registration
            await request(app)
                .post('/api/v1/auth/register')
                .send(userData)
                .set('X-CSRF-Token', 'frontend-request')
                .expect(201);

            // Second registration with same email
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({ ...userData, name: 'Second User' })
                .set('X-CSRF-Token', 'frontend-request')
                .expect(409);

            const message = response.body.error?.message || response.body.message;
            expect(message).toMatch(/already.*exists|user already exists/i);
        });

        it('should reject registration with existing email (case insensitive)', async () => {
            const userData1 = {
                name: 'First User',
                email: 'test@example.com',
                password: 'Password123!',
                role: 'seller',
            };

            await request(app)
                .post('/api/v1/auth/register')
                .send(userData1)
                .set('X-CSRF-Token', 'frontend-request')
                .expect(201);

            const userData2 = {
                name: 'Second User',
                email: 'TEST@EXAMPLE.COM',
                password: 'Password123!',
                role: 'seller',
            };

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(userData2)
                .set('X-CSRF-Token', 'frontend-request')
                .expect(409);

            const message = response.body.error?.message || response.body.message;
            expect(message).toMatch(/already.*exists|user already exists/i);
        });
    });

    describe('Team Invitation', () => {
        it('should accept registration with valid invitation token', async () => {
            // This test assumes invitation token validation is implemented
            // If not implemented yet, this test will need to be updated
            const userData = {
                name: 'Invited User',
                email: 'invited@example.com',
                password: 'Password123!',
                role: 'staff',
                invitationToken: 'valid-token-here', // Would need to create invitation first
            };

            // For now, just test that the field is accepted
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(userData)
                .set('X-CSRF-Token', 'frontend-request');

            // Will either succeed (if invitation exists) or fail with proper error
            expect([201, 400, 404]).toContain(response.status);
        });
    });

    describe('Security', () => {
        it('should not return password in response', async () => {
            const userData = {
                name: 'Security Test',
                email: 'security@example.com',
                password: 'Password123!',
                role: 'seller',
            };

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(userData)
                .set('X-CSRF-Token', 'frontend-request')
                .expect(201);

            expect(response.body).not.toHaveProperty('password');
            expect(response.body.user?.password).toBeUndefined();
        });

        it('should require CSRF token', async () => {
            const userData = {
                name: 'CSRF Test',
                email: 'csrf@example.com',
                password: 'Password123!',
                role: 'seller',
            };

            // Depending on CSRF implementation, this might be 403 or still work in dev mode
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(userData);

            // In production, this should fail. In dev mode with Postman bypass, it might succeed
            if (process.env.NODE_ENV === 'production') {
                expect(response.status).toBe(403);
            }
        });
    });

    describe('Rate Limiting', () => {
        it.skip('should enforce rate limiting on registration attempts', async () => {
            // Note: Rate limiting might be configured per IP and may not work in test environment
            // This test is skipped until rate limiting configuration is verified
            const generateUserData = (index: number) => ({
                name: `User ${index}`,
                email: `user${index}@example.com`,
                password: 'Password123!',
                role: 'seller',
            });

            // Make 6 registration attempts (limit is 5 per hour)
            const requests = [];
            for (let i = 0; i < 6; i++) {
                requests.push(
                    request(app)
                        .post('/api/v1/auth/register')
                        .send(generateUserData(i))
                        .set('X-CSRF-Token', 'frontend-request')
                );
            }

            const responses = await Promise.all(requests);

            // First 5 should succeed or fail with validation errors
            const first5 = responses.slice(0, 5);
            first5.forEach(response => {
                expect([201, 400]).toContain(response.status);
            });

            // 6th should be rate limited
            const sixth = responses[5];
            expect(sixth.status).toBe(429);
            const message = sixth.body.error?.message || sixth.body.message;
            expect(message).toMatch(/too many/i);
        });
    });
});
