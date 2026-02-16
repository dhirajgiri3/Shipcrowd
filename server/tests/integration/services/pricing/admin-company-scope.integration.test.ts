import { CourierService, Integration, ServiceRateCard } from '@/infrastructure/database/mongoose/models';
import cookieParser from 'cookie-parser';
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { clearTestDb, closeTestDb, connectTestDb } from '../../../setup/testDatabase';

jest.mock('@/core/application/services/communication/email.service', () => ({
    sendNewDeviceLoginEmail: jest.fn().mockResolvedValue(true),
    sendVerificationEmail: jest.fn().mockResolvedValue(true),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    sendMagicLinkEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/presentation/http/middleware/auth/auth', () => {
    const actual = jest.requireActual('@/presentation/http/middleware/auth/auth');
    return {
        ...actual,
        authenticate: (req: any, _res: any, next: any) => {
            req.user = {
                _id: new mongoose.Types.ObjectId().toString(),
                role: 'admin',
                isEmailVerified: true,
                kycStatus: {
                    isComplete: true,
                    state: 'verified',
                },
                teamRole: 'owner',
                teamStatus: 'active',
            };
            next();
        },
        csrfProtection: (_req: any, _res: any, next: any) => next(),
    };
});

import v1Routes from '@/presentation/http/routes/v1';

describe('Admin company scope for shipping list endpoints', () => {
    let app: express.Express;

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
        jest.restoreAllMocks();
        await clearTestDb();
    });

    it('GET /api/v1/admin/courier-services returns cross-company list for platform admin without companyId', async () => {
        const companyA = new mongoose.Types.ObjectId();
        const companyB = new mongoose.Types.ObjectId();

        const [integrationA, integrationB] = await Integration.create([
            {
                companyId: companyA,
                type: 'courier',
                provider: 'ekart',
                settings: { isActive: true },
                credentials: { apiKey: 'a-key' },
                isDeleted: false,
            },
            {
                companyId: companyB,
                type: 'courier',
                provider: 'delhivery',
                settings: { isActive: true },
                credentials: { apiKey: 'b-key' },
                isDeleted: false,
            },
        ]);

        await CourierService.create([
            {
                companyId: companyA,
                provider: 'ekart',
                integrationId: integrationA._id,
                serviceCode: 'EK_SURF_A',
                providerServiceId: 'SURF_A',
                displayName: 'Ekart Surface A',
                serviceType: 'surface',
                status: 'active',
                constraints: { paymentModes: ['cod', 'prepaid'] },
                sla: { eddMinDays: 2, eddMaxDays: 4 },
                zoneSupport: ['A', 'B'],
                source: 'manual',
                isDeleted: false,
            },
            {
                companyId: companyB,
                provider: 'delhivery',
                integrationId: integrationB._id,
                serviceCode: 'DL_EXP_B',
                providerServiceId: 'EXP_B',
                displayName: 'Delhivery Express B',
                serviceType: 'express',
                status: 'active',
                constraints: { paymentModes: ['prepaid'] },
                sla: { eddMinDays: 1, eddMaxDays: 3 },
                zoneSupport: ['C'],
                source: 'manual',
                isDeleted: false,
            },
        ]);

        const allRes = await request(app).get('/api/v1/admin/courier-services');
        expect(allRes.status).toBe(200);
        expect(allRes.body.success).toBe(true);
        expect(Array.isArray(allRes.body.data)).toBe(true);
        expect(allRes.body.data).toHaveLength(2);

        const scopedRes = await request(app).get(`/api/v1/admin/courier-services?companyId=${String(companyA)}`);
        expect(scopedRes.status).toBe(200);
        expect(scopedRes.body.success).toBe(true);
        expect(Array.isArray(scopedRes.body.data)).toBe(true);
        expect(scopedRes.body.data).toHaveLength(1);
        expect(scopedRes.body.data[0].serviceCode).toBe('EK_SURF_A');
    });

    it('GET /api/v1/admin/service-ratecards returns cross-company list for platform admin without companyId', async () => {
        const companyA = new mongoose.Types.ObjectId();
        const companyB = new mongoose.Types.ObjectId();
        const serviceA = new mongoose.Types.ObjectId();
        const serviceB = new mongoose.Types.ObjectId();

        await ServiceRateCard.create([
            {
                companyId: companyA,
                serviceId: serviceA,
                cardType: 'sell',
                sourceMode: 'TABLE',
                currency: 'INR',
                effectiveDates: { startDate: new Date('2026-02-01T00:00:00.000Z') },
                status: 'active',
                calculation: {
                    weightBasis: 'max',
                    roundingUnitKg: 0.5,
                    roundingMode: 'ceil',
                    dimDivisor: 5000,
                },
                zoneRules: [{ zoneKey: 'zoneA', slabs: [{ minKg: 0, maxKg: 1, charge: 100 }] }],
                isDeleted: false,
            },
            {
                companyId: companyB,
                serviceId: serviceB,
                cardType: 'cost',
                sourceMode: 'TABLE',
                currency: 'INR',
                effectiveDates: { startDate: new Date('2026-02-01T00:00:00.000Z') },
                status: 'active',
                calculation: {
                    weightBasis: 'max',
                    roundingUnitKg: 0.5,
                    roundingMode: 'ceil',
                    dimDivisor: 5000,
                },
                zoneRules: [{ zoneKey: 'zoneB', slabs: [{ minKg: 0, maxKg: 1, charge: 90 }] }],
                isDeleted: false,
            },
        ]);

        const allRes = await request(app).get('/api/v1/admin/service-ratecards');
        expect(allRes.status).toBe(200);
        expect(allRes.body.success).toBe(true);
        expect(Array.isArray(allRes.body.data)).toBe(true);
        expect(allRes.body.data).toHaveLength(2);

        const scopedRes = await request(app).get(`/api/v1/admin/service-ratecards?companyId=${String(companyB)}`);
        expect(scopedRes.status).toBe(200);
        expect(scopedRes.body.success).toBe(true);
        expect(Array.isArray(scopedRes.body.data)).toBe(true);
        expect(scopedRes.body.data).toHaveLength(1);
        expect(String(scopedRes.body.data[0].companyId)).toBe(String(companyB));
    });
});
