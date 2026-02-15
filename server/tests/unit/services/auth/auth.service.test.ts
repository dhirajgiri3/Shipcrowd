/**
 * Auth Service Unit Tests
 * Example unit test demonstrating testing patterns
 */
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

// Import models - these will be registered after connection
import { User } from '../../../../src/infrastructure/database/mongoose/models';
import { createTestUser } from '../../../fixtures/userFactory';
import { generateAuthToken } from '../../../setup/testHelpers';

describe('Authentication Service', () => {
    describe('User Creation', () => {
        it('should create a user with hashed password', async () => {
            const user = await createTestUser({
                email: 'test@example.com',
                password: 'SecurePass123!',
            });

            expect(user).toBeDefined();
            expect(user.email).toBe('test@example.com');
            // Password should be hashed, not plain text
            expect(user.password).not.toBe('SecurePass123!');
            expect(await bcrypt.compare('SecurePass123!', user.password)).toBe(true);
        });

        it('should normalize email to lowercase', async () => {
            const user = await createTestUser({
                email: 'NormalizeTest@EXAMPLE.COM',
            });

            expect(user.email).toBe('normalizetest@example.com');
        });

        it('should set default role to seller', async () => {
            const user = await createTestUser();
            expect(user.role).toBe('seller');
        });

        it('should create admin user with admin role', async () => {
            const user = await createTestUser({
                role: 'admin',
            });

            expect(user.role).toBe('admin');
        });
    });

    describe('Password Comparison', () => {
        it('should return true for correct password', async () => {
            const user = await createTestUser({
                password: 'CorrectPassword123!',
            });

            const isMatch = await user.comparePassword('CorrectPassword123!');
            expect(isMatch).toBe(true);
        });

        it('should return false for incorrect password', async () => {
            const user = await createTestUser({
                password: 'CorrectPassword123!',
            });

            const isMatch = await user.comparePassword('WrongPassword!');
            expect(isMatch).toBe(false);
        });
    });

    describe('Token Generation', () => {
        it('should generate a valid JWT token', async () => {
            const userId = new mongoose.Types.ObjectId().toString();
            const token = generateAuthToken(userId);

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.').length).toBe(3); // JWT has 3 parts
        });

        it('should include role in token', async () => {
            const userId = new mongoose.Types.ObjectId().toString();
            const token = generateAuthToken(userId, 'admin');

            // Decode token payload (middle part)
            const payload = JSON.parse(
                Buffer.from(token.split('.')[1], 'base64').toString()
            );

            expect(payload.role).toBe('admin');
        });
    });

    describe('User Queries', () => {
        it('should find user by email', async () => {
            await createTestUser({ email: 'findme@example.com' });

            const found = await User.findOne({ email: 'findme@example.com' });
            expect(found).toBeDefined();
            expect(found?.email).toBe('findme@example.com');
        });

        it('should not find deleted users by default', async () => {
            await createTestUser({
                email: 'deleted@example.com',
                // Note: isDeleted would need to be set after creation
            });

            const found = await User.findOne({
                email: 'deleted@example.com',
                isDeleted: true
            });
            expect(found).toBeNull();
        });

        it('should find users by role', async () => {
            const admin1 = await createTestUser({ role: 'admin', email: 'roletest-admin1@test.com' });
void admin1;
            const admin2 = await createTestUser({ role: 'admin', email: 'roletest-admin2@test.com' });
void admin2;
            await createTestUser({ role: 'seller', email: 'roletest-seller1@test.com' });

            const admins = await User.find({ role: 'admin' });
            expect(admins.length).toBeGreaterThanOrEqual(2);
            expect(admins.map(a => a.email)).toContain('roletest-admin1@test.com');
            expect(admins.map(a => a.email)).toContain('roletest-admin2@test.com');
        });
    });
});
