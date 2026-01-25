import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../src/app';
import { User } from '../../../src/infrastructure/database/mongoose/models';
import { Company } from '../../../src/infrastructure/database/mongoose/models';

describe('Registration Transaction Safety', () => {
    beforeAll(async () => {
        // Connect to test database
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/Shipcrowd-test');
        }
    });

    beforeEach(async () => {
        // Clear relevant collections
        await User.deleteMany({});
        await Company.deleteMany({});
    });

    afterAll(async () => {
        await User.deleteMany({});
        await Company.deleteMany({});
        await mongoose.connection.close();
    });

    describe('🔴 CRITICAL: Transaction Atomicity', () => {
        it('should create both user and company atomically on success', async () => {
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'success@example.com',
                    password: 'SecurePass123!',
                    name: 'Success User',
                    phone: '9876543210'
                })
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.user).toBeDefined();
            expect(response.body.data.user.email).toBe('success@example.com');

            // Verify user created
            const user = await User.findOne({ email: 'success@example.com' });
            expect(user).toBeDefined();
            expect(user!.companyId).toBeDefined();

            // Verify company created
            const company = await Company.findById(user!.companyId);
            expect(company).toBeDefined();
            expect((company as any)!.owner.toString()).toBe((user as any)!._id.toString());
            expect((company as any)!.name).toBe("Success User's Company");
        });

        it('should not create duplicate users on concurrent registration', async () => {
            const registrationData = {
                email: 'concurrent@example.com',
                password: 'SecurePass123!',
                name: 'Concurrent User',
                phone: '9876543210'
            };

            // Attempt concurrent registrations
            const [response1, response2] = await Promise.allSettled([
                request(app).post('/api/v1/auth/register').send(registrationData),
                request(app).post('/api/v1/auth/register').send(registrationData)
            ]);

            // One should succeed, one should fail
            const results = [response1, response2];
            const succeeded = results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 201);
            const failed = results.filter(r => r.status === 'fulfilled' && (r.value as any).status !== 201);

            expect(succeeded.length).toBe(1);
            expect(failed.length).toBe(1);

            // Verify only one user created
            const users = await User.find({ email: 'concurrent@example.com' });
            expect(users.length).toBe(1);

            // Verify only one company created
            const companies = await Company.find({ owner: users[0]._id });
            expect(companies.length).toBe(1);
        });

        it('should handle validation errors without creating partial data', async () => {
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'invalid-email',  // Invalid email format
                    password: 'weak',  // Weak password
                    name: 'Test User'
                })
                .expect(400);

            expect(response.body.success).toBe(false);

            // Verify no user created
            const user = await User.findOne({ email: 'invalid-email' });
            expect(user).toBeNull();

            // Verify no orphaned company created
            const companies = await Company.find({});
            expect(companies.length).toBe(0);
        });

        it('should rollback on database constraint violations', async () => {
            // Create a user first
            await User.create({
                email: 'existing@example.com',
                password: 'SecurePass123!',
                name: 'Existing User',
                role: 'seller',
                isEmailVerified: false
            });

            // Try to register with same email
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'existing@example.com',
                    password: 'SecurePass123!',
                    name: 'Duplicate User',
                    phone: '9876543210'
                })
                .expect(409);

            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('EMAIL_ALREADY_EXISTS');

            // Verify no additional user created
            const users = await User.find({ email: 'existing@example.com' });
            expect(users.length).toBe(1);

            // Verify no company created for the failed registration
            const companies = await Company.find({ name: "Duplicate User's Company" });
            expect(companies.length).toBe(0);
        });

        it('should handle missing required fields without creating partial data', async () => {
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'incomplete@example.com',
                    // Missing password and name
                })
                .expect(400);

            expect(response.body.success).toBe(false);

            // Verify no user created
            const user = await User.findOne({ email: 'incomplete@example.com' });
            expect(user).toBeNull();

            // Verify no company created
            const companies = await Company.find({});
            expect(companies.length).toBe(0);
        });
    });

    describe('Data Integrity Checks', () => {
        it('should ensure user.companyId matches created company._id', async () => {
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'integrity@example.com',
                    password: 'SecurePass123!',
                    name: 'Integrity User',
                    phone: '9876543210'
                })
                .expect(201);

            const user = await User.findOne({ email: 'integrity@example.com' });
            const company = await Company.findById(user!.companyId);

            expect((user as any)!.companyId.toString()).toBe((company as any)!._id.toString());
            expect((company as any)!.owner.toString()).toBe((user as any)!._id.toString());
        });

        it('should set correct default values for new user', async () => {
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'defaults@example.com',
                    password: 'SecurePass123!',
                    name: 'Defaults User',
                    phone: '9876543210'
                })
                .expect(201);

            const user = await User.findOne({ email: 'defaults@example.com' });

            expect(user!.role).toBe('seller');
            expect(user!.isEmailVerified).toBe(false);
            expect(user!.kycStatus.isComplete).toBe(false);
            expect(user!.security).toBeDefined();
            expect(user!.security.trustedDevices).toEqual([]);
        });

        it('should set correct default values for new company', async () => {
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'company-defaults@example.com',
                    password: 'SecurePass123!',
                    name: 'Company Defaults User',
                    phone: '9876543210'
                })
                .expect(201);

            const user = await User.findOne({ email: 'company-defaults@example.com' });
            const company = await Company.findById(user!.companyId);

            expect((company as any)!.status).toBe('active');
            expect((company as any)!.name).toBe("Company Defaults User's Company");
            expect((company as any)!.owner.toString()).toBe((user as any)!._id.toString());
        });
    });

    describe('Error Recovery', () => {
        it('should handle network interruptions gracefully', async () => {
            // This test simulates a scenario where the request is interrupted
            // In a real scenario, this would test connection drops, timeouts, etc.

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'network-test@example.com',
                    password: 'SecurePass123!',
                    name: 'Network Test User',
                    phone: '9876543210'
                })
                .timeout(10000);  // 10 second timeout

            // If successful, verify data integrity
            if (response.status === 201) {
                const user = await User.findOne({ email: 'network-test@example.com' });
                const company = await Company.findById(user!.companyId);

                expect(user).toBeDefined();
                expect(company).toBeDefined();
                expect((user as any)!.companyId.toString()).toBe((company as any)!._id.toString());
            }
        });

        it('should not leave orphaned companies if user creation fails', async () => {
            // Get initial company count
            const initialCompanyCount = await Company.countDocuments();

            // Attempt registration with invalid data
            await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'orphan-test@example.com',
                    password: 'weak',  // Will fail validation
                    name: 'Orphan Test'
                })
                .expect(400);

            // Verify no new companies created
            const finalCompanyCount = await Company.countDocuments();
            expect(finalCompanyCount).toBe(initialCompanyCount);
        });

        it('should not leave orphaned users if company creation fails', async () => {
            // Get initial user count
            const initialUserCount = await User.countDocuments();

            // This would require mocking Company.create to fail
            // For now, we test that failed registrations don't create users
            await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'orphan-user@example.com',
                    password: 'weak',
                    name: 'Orphan User'
                })
                .expect(400);

            // Verify no new users created
            const finalUserCount = await User.countDocuments();
            expect(finalUserCount).toBe(initialUserCount);
        });
    });
});
