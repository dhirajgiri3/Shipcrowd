import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { connectTestDb, closeTestDb, clearTestDb } from '../../../setup/testDatabase';
import QuoteEngineService from '@/core/application/services/pricing/quote-engine.service';
import BookFromQuoteService from '@/core/application/services/shipping/book-from-quote.service';
import { FeatureFlag, KYC, Order } from '@/infrastructure/database/mongoose/models';
import { KYCState } from '@/core/domain/types/kyc-state';
import { AppError } from '@/shared/errors/app.error';
import { ErrorCode } from '@/shared/errors/errorCodes';
import FeatureFlagService from '@/core/application/services/system/feature-flag.service';
import ratecardController from '@/presentation/http/controllers/shipping/ratecard.controller';
import shipmentController from '@/presentation/http/controllers/shipping/shipment.controller';

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
        await FeatureFlagService.clearAllCaches();
        await clearTestDb();
    });

    const seedAccessContext = async (enableFeatureFlag: boolean = true) => {
        await KYC.create({
            userId: new mongoose.Types.ObjectId(TEST_USER_ID),
            companyId: new mongoose.Types.ObjectId(TEST_COMPANY_ID),
            state: KYCState.VERIFIED,
            status: 'verified',
            documents: {},
        });

        if (enableFeatureFlag) {
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
        }
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

    it('POST /api/v1/quotes/courier-options returns partial results with provider timeout confidence', async () => {
        await seedAccessContext();

        jest.spyOn(QuoteEngineService, 'generateQuotes').mockResolvedValue({
            sessionId: 'session-timeout-1',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            options: [
                {
                    optionId: 'opt-delhivery-1',
                    provider: 'delhivery',
                    serviceName: 'Delhivery Surface',
                    quotedAmount: 132,
                    costAmount: 111,
                    estimatedMargin: 21,
                    estimatedMarginPercent: 15.9,
                    chargeableWeight: 0.5,
                    pricingSource: 'table',
                    confidence: 'medium',
                    rankScore: 0.9,
                    tags: ['RECOMMENDED'],
                },
            ] as any,
            recommendation: 'opt-delhivery-1',
            confidence: 'medium',
            providerTimeouts: { ekart: true },
        });

        const res = await request(app)
            .post('/api/v1/quotes/courier-options')
            .send({
                fromPincode: '560001',
                toPincode: '110001',
                weight: 0.5,
                dimensions: { length: 10, width: 10, height: 10 },
                paymentMode: 'prepaid',
                orderValue: 1000,
                shipmentType: 'forward',
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.confidence).toBe('medium');
        expect(res.body.data.providerTimeouts.ekart).toBe(true);
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
        const orderId = String(order._id);

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
            .post(`/api/v1/orders/${orderId}/ship`)
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
                orderId,
                sessionId: 'session-test-ship-1',
                optionId: 'opt-ekart-1',
                instructions: 'Fragile package',
            })
        );
    });

    it('POST /api/v1/orders/:orderId/ship returns 410 when quote session is expired', async () => {
        await seedAccessContext();

        const order = await Order.create({
            orderNumber: `API-ORDER-EXPIRED-${Date.now()}`,
            companyId: new mongoose.Types.ObjectId(TEST_COMPANY_ID),
            customerInfo: {
                name: 'Expired Session Customer',
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

        jest.spyOn(BookFromQuoteService, 'execute').mockRejectedValue(
            new AppError('Quote session expired', ErrorCode.BIZ_INVALID_STATE, 410)
        );

        const res = await request(app)
            .post(`/api/v1/orders/${String(order._id)}/ship`)
            .send({
                sessionId: 'expired-session-id',
                optionId: 'opt-ekart-1',
            });

        expect(res.status).toBe(410);
    });

    it('GET /api/v1/orders/courier-rates uses legacy controller path when flag is OFF', async () => {
        await seedAccessContext(false);

        const legacySpy = jest
            .spyOn(ratecardController, 'calculateRate')
            .mockImplementation(async (_req: any, res: any) => {
                res.status(200).json({
                    success: true,
                    data: [{ carrier: 'legacy', rate: 99 }],
                    message: 'legacy fallback hit',
                });
            });

        const res = await request(app)
            .get('/api/v1/orders/courier-rates')
            .query({
                fromPincode: '560001',
                toPincode: '110001',
                weight: 0.5,
            });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('legacy fallback hit');
        expect(legacySpy).toHaveBeenCalled();
    });

    it('POST /api/v1/orders/:orderId/ship uses legacy shipment path when flag is OFF', async () => {
        await seedAccessContext(false);

        const order = await Order.create({
            orderNumber: `API-ORDER-LEGACY-${Date.now()}`,
            companyId: new mongoose.Types.ObjectId(TEST_COMPANY_ID),
            customerInfo: {
                name: 'Legacy Customer',
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
                    name: 'Legacy Product',
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

        const legacyShipmentSpy = jest
            .spyOn(shipmentController, 'createShipment')
            .mockImplementation(async (_req: any, res: any) => {
                res.status(201).json({
                    success: true,
                    data: { shipment: { trackingNumber: 'LEGACY-TRK-1' } },
                    message: 'legacy shipment path',
                });
            });

        const res = await request(app)
            .post(`/api/v1/orders/${String(order._id)}/ship`)
            .send({
                serviceType: 'standard',
            });

        expect(res.status).toBe(201);
        expect(res.body.message).toBe('legacy shipment path');
        expect(legacyShipmentSpy).toHaveBeenCalled();
    });
});
