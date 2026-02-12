import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { connectTestDb, closeTestDb, clearTestDb } from '../../setup/testDatabase';
import v1Routes from '@/presentation/http/routes/v1';
import cookieParser from 'cookie-parser';
import { CourierService, Integration } from '@/infrastructure/database/mongoose/models';

// Mock email service to prevent attempting to send emails during tests
jest.mock('@/core/application/services/communication/email.service', () => ({
    sendNewDeviceLoginEmail: jest.fn().mockResolvedValue(true),
    sendVerificationEmail: jest.fn().mockResolvedValue(true),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    sendMagicLinkEmail: jest.fn().mockResolvedValue(true),
}));

describe('Admin Courier Management API', () => {
    let app: express.Express;
    let adminToken: string;
    let companyId: string;
    let userId: string;

    beforeAll(async () => {
        await connectTestDb();

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

    const createAdminAndLogin = async () => {
        const User = mongoose.model('User');
        companyId = new mongoose.Types.ObjectId().toString();

        // Create user
        const user = await User.create({
            email: 'admin@shipcrowd.com',
            password: 'Password123!',
            name: 'Admin User',
            role: 'admin',
            isActive: true,
            isEmailVerified: true,
            companyId: companyId
        });
        userId = user._id.toString();

        // Login
        const response = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: 'admin@shipcrowd.com',
                password: 'Password123!'
            });

        if (response.status !== 200) {
            console.log('Login failed:', response.status, JSON.stringify(response.body, null, 2));
        }

        // Extract cookies and filter out the "cleared" ones (expired/empty)
        const cookies = response.headers['set-cookie'] as unknown as string[];
        return cookies.filter((cookie: string) => !cookie.includes('Expires=Thu, 01 Jan 1970') && !cookie.includes('Max-Age=0'));
    };

    const seedCourier = async () => {
        const integration = await Integration.create({
            companyId,
            type: 'courier',
            provider: 'velocity-shipfast',
            settings: {
                isActive: true,
                baseUrl: 'https://api.velocity.test',
            },
            credentials: {
                apiKey: 'test-key',
            },
            isDeleted: false,
        });

        return await CourierService.create({
            companyId,
            provider: 'velocity',
            integrationId: integration._id,
            serviceCode: 'VEL_SURFACE',
            displayName: 'Velocity Surface',
            serviceType: 'surface',
            status: 'active',
            constraints: {
                maxCodValue: 50000,
                maxWeightKg: 50,
            },
            zoneSupport: ['A', 'B', 'C'],
            source: 'manual',
            isDeleted: false,
        });
    };

    describe('GET /api/v1/admin/couriers', () => {
        it('should list all couriers', async () => {
            const cookies = await createAdminAndLogin();
            await seedCourier();

            const response = await request(app)
                .get('/api/v1/admin/couriers') // Testing the new route mapping
                .set('Cookie', cookies);

            if (response.status !== 200) {
                console.log('GET couriers failed:', response.status, JSON.stringify(response.body, null, 2));
            }
            expect(response.status).toBe(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].id).toBe('velocity');
            expect(response.body.data[0].codLimit).toBe(50000);
        });
    });

    describe('GET /api/v1/admin/couriers/:id', () => {
        it('should return courier details', async () => {
            const cookies = await createAdminAndLogin();
            await seedCourier();

            const response = await request(app)
                .get('/api/v1/admin/couriers/velocity')
                .set('Cookie', cookies);

            if (response.status !== 200) {
                console.log('GET detail failed:', response.status, JSON.stringify(response.body, null, 2));
            }
            expect(response.status).toBe(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data._id).toBe('velocity');
            expect(response.body.data.services).toHaveLength(1);
        });
    });

    describe('PUT /api/v1/admin/couriers/:id', () => {
        it('should update courier details', async () => {
            const cookies = await createAdminAndLogin();
            await seedCourier();

            const updateData = {
                name: 'Velocity Updated',
                isActive: true,
                apiEndpoint: 'https://api.newvelocity.com'
            };

            const response = await request(app)
                .put('/api/v1/admin/couriers/velocity')
                .set('Cookie', cookies)
                .send(updateData);

            if (response.status !== 200) {
                console.log('PUT failed:', response.status, JSON.stringify(response.body, null, 2));
            }
            expect(response.status).toBe(200);

            expect(response.body.success).toBe(true);

            // Verify DB update
            const updated = await CourierService.findOne({ provider: 'velocity', companyId });
            expect(updated?.displayName).toBe('Velocity Surface');

            // Verify Integration creation/update
            const integration = await Integration.findOne({
                companyId,
                provider: 'velocity-shipfast',
                type: 'courier'
            });
            expect(integration?.settings.baseUrl).toBe('https://api.newvelocity.com');
        });
    });

    describe('POST /api/v1/admin/couriers/:id/toggle-status', () => {
        it('should toggle courier status', async () => {
            const cookies = await createAdminAndLogin();
            await seedCourier();

            const response = await request(app)
                .post('/api/v1/admin/couriers/velocity/toggle-status')
                .set('Cookie', cookies);

            if (response.status !== 200) {
                console.log('Toggle failed:', response.status, JSON.stringify(response.body, null, 2));
            }
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.isActive).toBe(false);

            const updated = await CourierService.findOne({ provider: 'velocity', companyId });
            expect(updated?.status).toBe('inactive');
        });
    });
});
