
// Mock express-rate-limit to bypass 429 Too Many Requests during tests
jest.mock('express-rate-limit', () => ({
    __esModule: true,
    default: jest.fn(() => (req: any, res: any, next: any) => next()),
    rateLimit: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { connectTestDb, closeTestDb, clearTestDb } from '../../setup/testDatabase';
import v1Routes from '@/presentation/http/routes/v1';
import cookieParser from 'cookie-parser';
import { Shipment } from '@/infrastructure/database/mongoose/models';
import EarlyCODEnrollment from '@/infrastructure/database/mongoose/models/finance/early-cod-enrollment.model';
import CODDiscrepancy from '@/infrastructure/database/mongoose/models/finance/cod-discrepancy.model';

describe('COD Finance API Integration (E2E)', () => {
    let app: express.Express;
    let agent: any;
    let companyId: mongoose.Types.ObjectId;
    let userId: mongoose.Types.ObjectId;

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

    // Reset Agent, User and DB before each test to ensure clean state and valid auth
    beforeEach(async () => {
        agent = request.agent(app);

        // Setup User & Login
        const User = mongoose.model('User');
        const Company = mongoose.model('Company');

        const company = await Company.create({
            name: 'Test COD Company',
            status: 'approved',
            kycStatus: 'verified',
            email: 'codtest@example.com',
            phone: '9999999999'
        });
        companyId = company._id;

        const user = await User.create({
            email: 'codtest@example.com',
            password: 'Test1234!',
            name: 'Test User',
            companyId: companyId,
            role: 'seller',
            isActive: true,
            isEmailVerified: true
        });
        userId = user._id;

        // Login
        await agent
            .post('/api/v1/auth/login')
            .send({
                email: 'codtest@example.com',
                password: 'Test1234!'
            })
            .expect(200);
    });

    afterEach(async () => {
        await clearTestDb();
    });

    describe('Early COD Program API', () => {
        it('should check eligibility', async () => {
            const res = await agent.get('/api/v1/finance/cod/early-program/eligibility').expect(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('qualified');
        });

        it('should enroll user in program', async () => {
            const res = await agent
                .post('/api/v1/finance/cod/early-program/enroll')
                .send({ tier: 'T+3' })
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe('active');

            const enrollment = await EarlyCODEnrollment.findOne({ companyId });
            expect(enrollment).not.toBeNull();
            expect(enrollment!.tier).toBe('T+3');
        });

        it('should fail enrollment if tier missing', async () => {
            await agent.post('/api/v1/finance/cod/early-program/enroll').send({}).expect(400);
        });
    });

    describe('COD Discrepancy API', () => {
        it('should list discrepancies', async () => {
            await CODDiscrepancy.create({
                discrepancyNumber: 'DISC-TEST',
                shipmentId: new mongoose.Types.ObjectId(),
                awb: 'AWB-DISC',
                companyId,
                carrier: 'Velocity',
                amounts: { expected: { cod: 1000, total: 1000 }, actual: { collected: 800, reported: 800, source: 'webhook' }, difference: -200, percentage: 20 },
                type: 'amount_mismatch',
                severity: 'medium',
                status: 'detected',
                createdAt: new Date()
            });

            const res = await agent.get('/api/v1/finance/cod/discrepancies').expect(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].discrepancyNumber).toBe('DISC-TEST');
        });

        it('should fetch single discrepancy details', async () => {
            const disc = await CODDiscrepancy.create({
                discrepancyNumber: 'DISC-ONE',
                shipmentId: new mongoose.Types.ObjectId(),
                awb: 'AWB-ONE',
                companyId,
                carrier: 'Velocity',
                amounts: { expected: { cod: 1000, total: 1000 }, actual: { collected: 800, reported: 800, source: 'webhook' }, difference: -200, percentage: 20 },
                type: 'amount_mismatch',
                severity: 'medium',
                status: 'detected'
            });

            const res = await agent.get(`/api/v1/finance/cod/discrepancies/${disc._id}`).expect(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.discrepancyNumber).toBe('DISC-ONE');
        });

        it('should resolve discrepancy', async () => {
            const shipment = await Shipment.create({
                trackingNumber: 'AWB-RES', companyId, orderId: new mongoose.Types.ObjectId(), carrier: 'Velocity', serviceType: 'exp', currentStatus: 'delivered',
                paymentDetails: { type: 'cod', codAmount: 1000, shippingCost: 100, collectionStatus: 'disputed' },
                packageDetails: { weight: 1, dimensions: { length: 1, width: 1, height: 1 }, packageCount: 1, packageType: 'box', declaredValue: 1000 },
                weights: { declared: { value: 1, unit: 'kg' }, verified: false },
                deliveryDetails: { recipientName: 'T', recipientPhone: '9', address: { line1: 'x', city: 'c', state: 's', country: 'i', postalCode: '1' } }
            });

            const disc = await CODDiscrepancy.create({
                discrepancyNumber: 'DISC-RES',
                shipmentId: shipment._id,
                awb: 'AWB-RES',
                companyId,
                carrier: 'Velocity',
                amounts: { expected: { cod: 1000, total: 1000 }, actual: { collected: 800, reported: 800, source: 'webhook' }, difference: -200, percentage: 20 },
                type: 'amount_mismatch',
                severity: 'medium',
                status: 'detected'
            });

            const res = await agent
                .post(`/api/v1/finance/cod/discrepancies/${disc._id}/resolve`)
                .send({
                    method: 'courier_adjustment',
                    adjustedAmount: 800,
                    remarks: 'Resolved via API'
                })
                .expect(200);

            expect(res.body.success).toBe(true);
        });
    });
});
