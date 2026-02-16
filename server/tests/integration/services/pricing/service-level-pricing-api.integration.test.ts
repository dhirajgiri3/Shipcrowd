import QuoteEngineService from '@/core/application/services/pricing/quote-engine.service';
import ServiceRateCardFormulaService from '@/core/application/services/pricing/service-rate-card-formula.service';
import BookFromQuoteService from '@/core/application/services/shipping/book-from-quote.service';
import { KYCState } from '@/core/domain/types/kyc-state';
import { CourierService, Integration, KYC, Order, ServiceRateCard } from '@/infrastructure/database/mongoose/models';
import { AppError } from '@/shared/errors/app.error';
import { ErrorCode } from '@/shared/errors/errorCodes';
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

const TEST_USER_ID = new mongoose.Types.ObjectId().toString();
const TEST_COMPANY_ID = new mongoose.Types.ObjectId().toString();
let TEST_USER_ROLE: 'seller' | 'admin' = 'seller';

jest.mock('@/presentation/http/middleware/auth/auth', () => {
    const actual = jest.requireActual('@/presentation/http/middleware/auth/auth');
    return {
        ...actual,
        authenticate: (req: any, _res: any, next: any) => {
            req.user = {
                _id: TEST_USER_ID,
                role: TEST_USER_ROLE,
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
        TEST_USER_ROLE = 'seller';
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
    };

    const createOrder = async (suffix: string) =>
        Order.create({
            orderNumber: `API-ORDER-${suffix}-${Date.now()}`,
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

    it('POST /api/v1/quotes/courier-options returns quote options', async () => {
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
                    rankScore: 1,
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

    it('GET /api/v1/orders/courier-rates returns canonical quote session payload', async () => {
        await seedAccessContext();

        jest.spyOn(QuoteEngineService, 'generateQuotes').mockResolvedValue({
            sessionId: 'session-rates-1',
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
        } as any);

        const res = await request(app)
            .get('/api/v1/orders/courier-rates')
            .query({
                fromPincode: '560001',
                toPincode: '110001',
                weight: 0.5,
                length: 10,
                width: 10,
                height: 10,
                paymentMode: 'prepaid',
                orderValue: 1000,
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.sessionId).toBe('session-rates-1');
        expect(Array.isArray(res.body.data.options)).toBe(true);
        expect(res.body.data.options[0].optionId).toBe('opt-delhivery-1');
    });

    it('GET /api/v1/ratecards is no longer exposed after shipping cutover', async () => {
        await seedAccessContext();

        const res = await request(app).get('/api/v1/ratecards');

        expect(res.status).toBe(404);
    });

    it('POST /api/v1/courier/recommendations uses quote-engine service-level flow', async () => {
        await seedAccessContext();

        jest.spyOn(QuoteEngineService, 'generateQuotes').mockResolvedValue({
            sessionId: 'session-reco-1',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            recommendation: 'opt-reco-1',
            confidence: 'high',
            options: [
                {
                    optionId: 'opt-reco-1',
                    provider: 'ekart',
                    serviceName: 'Ekart Surface',
                    quotedAmount: 149,
                    eta: { minDays: 2, maxDays: 3 },
                    tags: ['RECOMMENDED'],
                },
            ],
        } as any);

        const res = await request(app)
            .post('/api/v1/courier/recommendations')
            .send({
                pickupPincode: '560001',
                deliveryPincode: '110001',
                weight: 1.2,
                paymentMode: 'prepaid',
                declaredValue: 1600,
                dimensions: { length: 10, width: 10, height: 10 },
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data.recommendations)).toBe(true);
        expect(res.body.data.recommendations[0].id).toBe('opt-reco-1');
        expect(res.body.data.recommendations[0].recommended).toBe(true);
        expect(res.body.data.metadata.sessionId).toBe('session-reco-1');

        expect(QuoteEngineService.generateQuotes).toHaveBeenCalledWith(
            expect.objectContaining({
                companyId: TEST_COMPANY_ID,
                sellerId: TEST_USER_ID,
                fromPincode: '560001',
                toPincode: '110001',
                weight: 1.2,
                paymentMode: 'prepaid',
                orderValue: 1600,
                shipmentType: 'forward',
            })
        );
    });

    it('POST /api/v1/orders/:orderId/ship uses quote-based booking path', async () => {
        await seedAccessContext();
        const order = await createOrder('BOOK');
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

    it('POST /api/v1/orders/:orderId/ship rejects missing sessionId', async () => {
        await seedAccessContext();
        const order = await createOrder('MISSING-SESSION');

        const res = await request(app)
            .post(`/api/v1/orders/${String(order._id)}/ship`)
            .send({
                optionId: 'opt-ekart-1',
            });

        expect(res.status).toBe(422);
    });

    it('POST /api/v1/orders/:orderId/ship rejects missing optionId', async () => {
        await seedAccessContext();
        const order = await createOrder('MISSING-OPTION');

        const res = await request(app)
            .post(`/api/v1/orders/${String(order._id)}/ship`)
            .send({
                sessionId: 'session-test',
            });

        expect(res.status).toBe(422);
    });

    it('POST /api/v1/orders/:orderId/ship rejects legacy payload format without quote identifiers', async () => {
        await seedAccessContext();
        const order = await createOrder('LEGACY-PAYLOAD');
        const executeSpy = jest.spyOn(BookFromQuoteService, 'execute');

        const res = await request(app)
            .post(`/api/v1/orders/${String(order._id)}/ship`)
            .send({
                courierId: 'ekart',
                courierName: 'Ekart Surface',
                rate: 120,
                estimatedDeliveryDays: 4,
                specialInstructions: 'legacy payload',
            });

        expect(res.status).toBe(422);
        expect(executeSpy).not.toHaveBeenCalled();
    });

    it('POST /api/v1/orders/:orderId/ship returns 410 when quote session is expired', async () => {
        await seedAccessContext();
        const order = await createOrder('EXPIRED');

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

    it('POST /api/v1/admin/service-ratecards/:id/simulate returns formula pricing breakdown', async () => {
        TEST_USER_ROLE = 'admin';
        await seedAccessContext();

        const card = await ServiceRateCard.create({
            companyId: null,
            serviceId: new mongoose.Types.ObjectId(),
            cardType: 'sell',
            flowType: 'forward',
            category: 'default',
            sourceMode: 'TABLE',
            currency: 'INR',
            effectiveDates: { startDate: new Date(Date.now() - 60_000) },
            status: 'active',
            calculation: {
                weightBasis: 'max',
                roundingUnitKg: 0.5,
                roundingMode: 'ceil',
                dimDivisor: 5000,
            },
            zoneRules: [
                {
                    zoneKey: 'zoneD',
                    slabs: [
                        { minKg: 0, maxKg: 0.5, charge: 100 },
                        { minKg: 0.5, maxKg: 1, charge: 130 },
                    ],
                    additionalPerKg: 50,
                    fuelSurcharge: { percentage: 10, base: 'freight' },
                },
            ],
            isDeleted: false,
        });

        jest.spyOn(ServiceRateCardFormulaService, 'calculatePricing').mockReturnValue({
            chargeableWeight: 0.8,
            baseCharge: 130,
            weightCharge: 0,
            subtotal: 130,
            codCharge: 0,
            fuelCharge: 13,
            rtoCharge: 0,
            gstBreakdown: {
                cgst: 12.87,
                sgst: 12.87,
                igst: 0,
                total: 25.74,
            },
            totalAmount: 168.74,
            breakdown: {
                weight: {
                    actualWeight: 0.8,
                    volumetricWeight: 0.2,
                    chargeableWeight: 0.8,
                    weightBasisUsed: 'max',
                    chargedBy: 'actual',
                    dimDivisorUsed: 5000,
                },
                zone: {
                    inputZone: 'zoneD',
                    resolvedZone: 'zoned',
                    source: 'input',
                    matchedZoneRule: 'zoneD',
                },
                slab: {
                    minKg: 0.5,
                    maxKg: 1,
                    slabCharge: 130,
                    beyondMaxSlab: false,
                    additionalPerKg: 50,
                    extraWeightKg: 0,
                    roundedExtraWeightKg: 0,
                    roundingUnitKg: 0.5,
                    roundingMode: 'ceil',
                },
                cod: {
                    paymentMode: 'prepaid',
                    ruleType: 'not_applicable',
                    fallbackApplied: false,
                    charge: 0,
                },
                fuel: {
                    percentage: 0.1,
                    base: 'freight',
                    baseAmount: 130,
                    charge: 13,
                },
                rto: {
                    charge: 0,
                    calculationMode: 'not_applicable',
                    fallbackApplied: false,
                    baseAmount: 0,
                    includedInQuoteTotal: true,
                },
                gst: {
                    fromStateCode: '29',
                    toStateCode: '29',
                    intraState: true,
                    taxableAmount: 143,
                    breakdown: {
                        cgst: 12.87,
                        sgst: 12.87,
                        igst: 0,
                        total: 25.74,
                    },
                },
            },
        });

        const res = await request(app)
            .post(`/api/v1/admin/service-ratecards/${String(card._id)}/simulate`)
            .send({
                weight: 0.8,
                dimensions: { length: 10, width: 10, height: 10 },
                zone: 'zoneD',
                paymentMode: 'prepaid',
                orderValue: 1200,
                provider: 'delhivery',
                fromPincode: '560001',
                toPincode: '110001',
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.pricing.totalAmount).toBeGreaterThan(0);
        expect(res.body.data.pricing.breakdown.weight.chargeableWeight).toBeGreaterThan(0);
        expect(res.body.data.card.id).toBe(String(card._id));
        expect(res.body.data.card.cardType).toBe('sell');
        expect(res.body.data.card.sourceMode).toBe('TABLE');
        expect(res.body.data.card.currency).toBe('INR');
    });

    it('POST /api/v1/admin/service-ratecards/:id/simulate rejects invalid request payload', async () => {
        TEST_USER_ROLE = 'admin';
        await seedAccessContext();
        const card = await ServiceRateCard.create({
            companyId: null,
            serviceId: new mongoose.Types.ObjectId(),
            cardType: 'sell',
            flowType: 'forward',
            category: 'default',
            sourceMode: 'TABLE',
            currency: 'INR',
            effectiveDates: { startDate: new Date(Date.now() - 60_000) },
            status: 'active',
            calculation: { weightBasis: 'max' },
            zoneRules: [{ zoneKey: 'zoneD', slabs: [{ minKg: 0, maxKg: 1, charge: 100 }] }],
            isDeleted: false,
        });

        const res = await request(app)
            .post(`/api/v1/admin/service-ratecards/${String(card._id)}/simulate`)
            .send({
                weight: -1,
                fromPincode: 'INVALID',
            });

        expect(res.status).toBe(400);
    });

    it('POST /api/v1/admin/service-ratecards rejects overlapping active effective windows', async () => {
        TEST_USER_ROLE = 'admin';
        await seedAccessContext();

        const serviceId = new mongoose.Types.ObjectId();
        await ServiceRateCard.create({
            companyId: null,
            serviceId,
            cardType: 'sell',
            flowType: 'forward',
            category: 'default',
            sourceMode: 'TABLE',
            currency: 'INR',
            effectiveDates: { startDate: new Date('2026-01-01T00:00:00.000Z') },
            status: 'active',
            calculation: {
                weightBasis: 'max',
                roundingUnitKg: 0.5,
                roundingMode: 'ceil',
                dimDivisor: 5000,
            },
            zoneRules: [
                {
                    zoneKey: 'zoneD',
                    slabs: [{ minKg: 0, maxKg: 1, charge: 100 }],
                },
            ],
            isDeleted: false,
        });

        const res = await request(app)
            .post('/api/v1/admin/service-ratecards')
            .send({
                serviceId: String(serviceId),
                cardType: 'sell',
                flowType: 'forward',
                category: 'default',
                sourceMode: 'TABLE',
                currency: 'INR',
                effectiveDates: { startDate: '2026-01-15T00:00:00.000Z' },
                status: 'active',
                calculation: {
                    weightBasis: 'max',
                    roundingUnitKg: 0.5,
                    roundingMode: 'ceil',
                    dimDivisor: 5000,
                },
                zoneRules: [
                    {
                        zoneKey: 'zoneD',
                        slabs: [{ minKg: 0, maxKg: 1, charge: 110 }],
                    },
                ],
            });

        expect(res.status).toBe(409);
    });

    it('GET /api/v1/admin/courier-services returns providerServiceId and constraint fields', async () => {
        TEST_USER_ROLE = 'admin';
        await seedAccessContext();
        const integration = await Integration.create({
            companyId: null,
            type: 'courier',
            provider: 'ekart',
            settings: {
                isActive: true,
            },
            credentials: {
                apiKey: 'test-key',
            },
            isDeleted: false,
        });

        await CourierService.create({
            companyId: null,
            provider: 'ekart',
            integrationId: integration._id,
            serviceCode: 'EK_SURF',
            providerServiceId: 'SURFACE',
            displayName: 'Ekart Surface',
            serviceType: 'surface',
            flowType: 'forward',
            status: 'active',
            constraints: {
                maxCodValue: 30000,
                maxPrepaidValue: 60000,
                paymentModes: ['cod', 'prepaid'],
            },
            sla: {
                eddMinDays: 2,
                eddMaxDays: 5,
            },
            zoneSupport: ['A', 'B', 'C'],
            source: 'manual',
            isDeleted: false,
        });

        const res = await request(app).get('/api/v1/admin/courier-services');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data[0]).toMatchObject({
            serviceCode: 'EK_SURF',
            providerServiceId: 'SURFACE',
            constraints: {
                maxCodValue: 30000,
                maxPrepaidValue: 60000,
                paymentModes: ['cod', 'prepaid'],
            },
        });
    });

    it('POST /api/v1/admin/service-ratecards stores COD/Fuel/RTO rules with effective window', async () => {
        TEST_USER_ROLE = 'admin';
        await seedAccessContext();

        const serviceId = new mongoose.Types.ObjectId();
        const payload = {
            serviceId: String(serviceId),
            cardType: 'sell',
            flowType: 'forward',
            category: 'default',
            sourceMode: 'TABLE',
            currency: 'INR',
            effectiveDates: {
                startDate: '2026-02-01T00:00:00.000Z',
                endDate: '2026-03-01T00:00:00.000Z',
            },
            status: 'active',
            calculation: {
                weightBasis: 'max',
                roundingUnitKg: 0.5,
                roundingMode: 'ceil',
                dimDivisor: 5000,
            },
            zoneRules: [
                {
                    zoneKey: 'zoneD',
                    slabs: [{ minKg: 0, maxKg: 1, charge: 120 }],
                    additionalPerKg: 50,
                    codRule: {
                        type: 'slab',
                        basis: 'orderValue',
                        slabs: [
                            { min: 0, max: 1000, value: 25, type: 'flat' },
                            { min: 1000, max: 5000, value: 1.5, type: 'percentage' },
                        ],
                    },
                    fuelSurcharge: {
                        percentage: 10,
                        base: 'freight_cod',
                    },
                    rtoRule: {
                        type: 'percentage',
                        percentage: 55,
                        minCharge: 30,
                        maxCharge: 200,
                    },
                },
            ],
        };

        const res = await request(app).post('/api/v1/admin/service-ratecards').send(payload);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.effectiveDates.startDate).toBe(payload.effectiveDates.startDate);
        expect(res.body.data.effectiveDates.endDate).toBe(payload.effectiveDates.endDate);
        expect(res.body.data.zoneRules[0]).toMatchObject({
            codRule: {
                type: 'slab',
                basis: 'orderValue',
            },
            fuelSurcharge: {
                percentage: 10,
                base: 'freight_cod',
            },
            rtoRule: {
                type: 'percentage',
                percentage: 55,
                minCharge: 30,
                maxCharge: 200,
            },
        });
    });
});
