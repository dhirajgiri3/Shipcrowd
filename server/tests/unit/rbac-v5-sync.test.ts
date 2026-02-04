import Link from 'mongoose';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '@/infrastructure/database/mongoose/models/iam/users/user.model';
import Role from '@/infrastructure/database/mongoose/models/iam/role.model';
import Membership from '@/infrastructure/database/mongoose/models/iam/membership.model';
import Company from '@/infrastructure/database/mongoose/models/organization/core/company.model';
import PermissionService from '@/core/application/services/auth/permission.service';
import Redis from 'ioredis-mock';

// Mock Redis
jest.mock('ioredis', () => require('ioredis-mock'));

// Set Env vars before models load (Critical for field encryption)
process.env.ENCRYPTION_KEY = 'd99716e21c089e3c1d530e69ea1b956dc676cae451e9e4d47154d8dea2721875';
process.env.MFA_ENCRYPTION_KEY = 'd7939b49ff52fcea';

let mongoServer: MongoMemoryServer;

const seedRoles = async () => {
    await Role.create([
        { name: 'super_admin', scope: 'global', permissions: ['*'], isSystem: true },
        { name: 'admin', scope: 'global', permissions: ['*'], isSystem: true },
        { name: 'user', scope: 'global', permissions: [], isSystem: true },
        { name: 'owner', scope: 'company', permissions: ['*'], isSystem: true },
        { name: 'member', scope: 'company', permissions: ['read'], isSystem: true },
        { name: 'manager', scope: 'company', permissions: ['manage'], isSystem: true },
    ]);
};

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create({
        instance: { ip: '127.0.0.1' }
    });
    const uri = mongoServer.getUri();
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    await mongoose.connect(uri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    // Global helper wipes DB, so we must re-seed
    await seedRoles();
});

describe('RBAC V5 Synchronization Hooks', () => {
    describe('User → V5 Sync', () => {
        it('should update platformRole when user.role changes', async () => {
            const user = await User.create({
                email: 'test@test.com',
                name: 'Test',
                role: 'seller', // Should map to 'user'
                password: 'password123'
            });

            // Verify initial state
            const initialUser = await User.findById(user._id).populate('platformRole');
            // Note: isNew check in hook means initial create doesn't trigger sync unless handled by registration logic
            // So platformRole might be undefined here, which is expected behavior for raw create.

            // Update role (triggers sync)
            user.role = 'admin';
            await user.save();

            const updatedUser = await User.findById(user._id).populate('platformRole');
            // @ts-ignore
            expect(updatedUser.platformRole).toBeDefined();
            // @ts-ignore
            expect(updatedUser.platformRole.name).toBe('admin');
        });

        it('should create Membership when companyId is set', async () => {
            const company = await Company.create({ name: 'Test Co', billingInfo: {}, branding: {}, integrations: {}, settings: {}, wallet: {} });
            const user = await User.create({
                email: 'test2@test.com',
                name: 'Test',
                role: 'seller',
                password: 'password123'
            });

            // Update to trigger hooks
            user.companyId = company._id;
            user.teamRole = 'owner';
            await user.save();

            const membership = await Membership.findOne({ userId: user._id, companyId: company._id });
            expect(membership).toBeDefined();
            expect(membership?.status).toBe('active');

            const roles = await Role.find({ _id: { $in: membership?.roles } });
            expect(roles[0].name).toBe('owner');
        });

        it('should Reverse Sync: Update User.companyId when Membership is created', async () => {
            const user = await User.create({
                name: 'Reverse User',
                email: 'reverse@test.com',
                password: 'password123',
                role: 'seller'
            });
            const company = await Company.create({ name: 'Reverse Co' });
            const ownerRole = await Role.findOne({ name: 'owner', scope: 'company' });

            // Create Membership directly (V5 way)
            await Membership.create({
                userId: user._id,
                companyId: company._id,
                roles: [ownerRole?._id],
                status: 'active'
            });

            // Verify User was updated (Legacy way)
            const updatedUser = await User.findById(user._id);
            expect(updatedUser?.companyId?.toString()).toBe(company._id.toString());
            expect(updatedUser?.teamRole).toBe('owner');
        });
    });

    describe('User.findByIdAndUpdate() Sync', () => {
        it('should sync when using findByIdAndUpdate', async () => {
            const company = await Company.create({ name: 'Test Co Update', billingInfo: {}, branding: {}, integrations: {}, settings: {}, wallet: {} });
            const user = await User.create({
                email: 'test3@test.com',
                name: 'Test',
                role: 'seller',
                password: 'password123'
            });

            // THIS IS THE CRITICAL TEST - controllers use this pattern
            await User.findByIdAndUpdate(user._id, {
                companyId: company._id,
                teamRole: 'member'
            });

            // Verify Membership was created
            const membership = await Membership.findOne({ userId: user._id, companyId: company._id });
            expect(membership).toBeDefined();
            expect(membership?.status).toBe('active');

            const roles = await Role.find({ _id: { $in: membership?.roles } });
            expect(roles[0].name).toBe('member');
        });
    });

    describe('Ownership Enforcement', () => {
        it('should prevent removing last owner via Membership update', async () => {
            const company = await Company.create({ name: 'Test Co Owner', billingInfo: {}, branding: {}, integrations: {}, settings: {}, wallet: {} });
            const ownerRole = await Role.findOne({ name: 'owner', scope: 'company' });

            const user = await User.create({ email: 'owner@test.com', name: 'Owner', role: 'seller', password: 'password123' });

            // Create membership manually to bypass hook/setup
            const membership = await Membership.create({
                userId: user._id,
                companyId: company._id,
                roles: [ownerRole?._id],
                status: 'active'
            });

            // Try to suspend
            membership.status = 'suspended';

            await expect(membership.save()).rejects.toThrow(/Cannot remove last owner/);
        });

        it('should prevent removing last owner via User update', async () => {
            const company = await Company.create({ name: 'Test Co Owner User', billingInfo: {}, branding: {}, integrations: {}, settings: {}, wallet: {} });

            const user = await User.create({
                email: 'owner2@test.com',
                name: 'Owner',
                role: 'seller',
                teamRole: 'owner',
                companyId: company._id,
                password: 'password123'
            });

            // Populate sync manually mainly to setup state
            await user.save();

            // Check if membership was created by sync
            const membership = await Membership.findOne({ userId: user._id });
            expect(membership).toBeDefined();

            // Now try to demote using save hook
            user.teamRole = 'member';
            try {
                await user.save();
                fail('Should have thrown error');
            } catch (e: any) {
                expect(e.message).toMatch(/Cannot change role of last owner/);
            }
        });
    });
});
