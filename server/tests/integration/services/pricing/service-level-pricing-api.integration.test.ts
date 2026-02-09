import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { connectTestDb, closeTestDb, clearTestDb } from '../../../setup/testDatabase';
import QuoteEngineService from '@/core/application/services/pricing/quote-engine.service';
import BookFromQuoteService from '@/core/application/services/shipping/book-from-quote.service';
import { FeatureFlag, KYC, Order } from '@/infrastructure/database/mongoose/models';
import { KYCState } from '@/core/domain/types/kyc-state';

// Mock email sends during auth flows in tests
jest.mock('@/core/application/services/communication/email.service', () => ({
    sendNewDeviceLoginEmail: jest.fn().mockResolvedValue(true),
    sendVerificationEmail: jest.fn().mockResolvedValue(true),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    sendMagicLinkEmail: jest.fn().mockResolvedValue(true),
}));

const TEST_USER_ID = new mongoose.Types.ObjectId().toString();
const TEST_COMPANY_ID = new mongoose.Types.ObjectId().toString();

// Deterministic auth context for API-level route tests
jest.mock('@/presentation/http/middleware/auth/auth', () => {
    const actual = jest.requireActual('@/presentation/http/middleware/auth/auth');
    return {
        ...actual,
        authenticate: (req: any, _res: any, next: any) => {
            req.user = {
                _id: TEST_USER_ID,
                role: 'seller',
                companyId: TEST_COMPANY_ID,
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

describe('Service-Level Pricing API Integration', () => {
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

    const seedAccessContext = async () => {
        await KYC.create({
            userId: new mongoose.Types.ObjectId(TEST_USER_ID),
            companyId: new mongoose.Types.ObjectId(TEST_COMPANY_ID),
            state: KYCState.VERIFIED,
            status: 'verified',
            documents: {},
        });

        await FeatureFlag.create({
            key: 'enable_service_level_pricing',
            name: 'Enable Service Level Pricing',
            description: 'Test flag for service-level pricing routes',
            type: 'boolean',
            isEnabled: true,
            rules: [],
            createdBy: new mongoose.Types.ObjectId(TEST_USER_ID),
            isArchived: false,
        });
    };

    it('POST /api/v1/quotes/courier-options returns quote options when feature flag is ON', async () => {
        await seedAccessContext();

        jest.spyOn(QuoteEngineService, 'generateQuotes').mockResolvedValue({
            sessionId: 'session-test-1',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            options: [
                {
                    optionId: 'opt-ekart-1',
                    provider: 'ekart',
                    serviceName: 'Ekart Surface',
                    quotedAmount: 120,
                    costAmount: 100,
                    estimatedMargin: 20,
                    estimatedMarginPercent: 16.67,
                    chargeableWeight: 0.5,
                    zone: 'zoneD',
                    pricingSource: 'table',
                    confidence: 'high',
                    tags: ['RECOMMENDED'],
                },
            ] as any,
            recommendation: 'opt-ekart-1',
            confidence: 'high',
            providerTimeouts: {},
        } as any);

        const res = await request(app)
            .post('/api/v1/quotes/courier-options')
            .send({
                fromPincode: '560001',
                toPincode: '110001',
                weight: 0.5,
                dimensions: {
                    length: 10,
                    width: 10,
                    height: 10,
                },
                paymentMode: 'prepaid',
                orderValue: 1000,
                shipmentType: 'forward',
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.sessionId).toBe('session-test-1');
        expect(res.body.data.recommendation).toBe('opt-ekart-1');

        expect(QuoteEngineService.generateQuotes).toHaveBeenCalledWith(
            expect.objectContaining({
                companyId: TEST_COMPANY_ID,
                sellerId: TEST_USER_ID,
            })
        );
    });

    it('POST /api/v1/orders/:orderId/ship uses quote-based booking path when sessionId is provided and flag is ON', async () => {
        await seedAccessContext();

        const order = await Order.create({
            orderNumber: `API-ORDER-${Date.now()}`,
            companyId: new mongoose.Types.ObjectId(TEST_COMPANY_ID),
            customerInfo: {
                name: 'Test Customer',
                phone: '9999999999',
                address: {
                    line1: 'Test Line',
                    city: 'Bangalore',
                    state: 'Karnataka',
                    country: 'India',
                    postalCode: '560001',
                },
            },
            products: [
                {
                    name: 'Test Product',
                    quantity: 1,
                    price: 1000,
                    weight: 0.5,
                },
            ],
            shippingDetails: { shippingCost: 0 },
            paymentStatus: 'pending',
            paymentMethod: 'prepaid',
            source: 'manual',
            currentStatus: 'pending',
            statusHistory: [],
            totals: {
                subtotal: 1000,
                tax: 0,
                shipping: 0,
                discount: 0,
                total: 1000,
            },
            isDeleted: false,
        });

        jest.spyOn(BookFromQuoteService, 'execute').mockResolvedValue({
            sessionId: 'session-test-ship-1',
            optionId: 'opt-ekart-1',
            shipment: { _id: new mongoose.Types.ObjectId(), trackingNumber: 'TRK-API-1' },
            carrierSelection: {
                selectedCarrier: 'ekart',
                selectedRate: 120,
                selectedDeliveryTime: 4,
                alternativeOptions: [],
            },
            pricingSnapshot: {
                quotedAmount: 120,
                expectedCost: 100,
                expectedMargin: 20,
            },
        } as any);

        const res = await request(app)
            .post(`/api/v1/orders/${order._id.toString()}/ship`)
            .send({
                sessionId: 'session-test-ship-1',
                optionId: 'opt-ekart-1',
                specialInstructions: 'Fragile package',
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.sessionId).toBe('session-test-ship-1');
        expect(res.body.data.optionId).toBe('opt-ekart-1');

        expect(BookFromQuoteService.execute).toHaveBeenCalledWith(
            expect.objectContaining({
                companyId: TEST_COMPANY_ID,
                sellerId: TEST_USER_ID,
                orderId: order._id.toString(),
                sessionId: 'session-test-ship-1',
                optionId: 'opt-ekart-1',
                instructions: 'Fragile package',
            })
        );
    });
});
