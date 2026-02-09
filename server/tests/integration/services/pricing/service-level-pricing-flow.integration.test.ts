import mongoose from 'mongoose';
import CarrierBillingReconciliationService from '@/core/application/services/finance/carrier-billing-reconciliation.service';
import QuoteEngineService from '@/core/application/services/pricing/quote-engine.service';
import BookFromQuoteService from '@/core/application/services/shipping/book-from-quote.service';
import { ShipmentService } from '@/core/application/services/shipping/shipment.service';
import WalletService from '@/core/application/services/wallet/wallet.service';
import { ErrorCode } from '@/shared/errors/errorCodes';
import {
    CarrierBillingRecord,
    Order,
    PricingVarianceCase,
    QuoteSession,
    Shipment,
} from '@/infrastructure/database/mongoose/models';

describe('Service-Level Pricing Flow Integration', () => {
    const companyId = new mongoose.Types.ObjectId();
    const sellerId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    const createBaseOrder = async () => {
        return Order.create({
            orderNumber: `TEST-ORDER-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            companyId,
            customerInfo: {
                name: 'Test Customer',
                phone: '9999999999',
                address: {
                    line1: 'Test Line 1',
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
            shippingDetails: {
                shippingCost: 0,
            },
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
    };

    const createQuoteSession = async (expiresAt: Date) => {
        return QuoteSession.create({
            companyId,
            sellerId,
            input: {
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
            },
            options: [
                {
                    optionId: 'opt-1',
                    provider: 'ekart',
                    serviceName: 'Ekart Surface',
                    chargeableWeight: 0.5,
                    zone: 'zoneD',
                    quotedAmount: 120,
                    costAmount: 100,
                    estimatedMargin: 20,
                    estimatedMarginPercent: 16.67,
                    pricingSource: 'table',
                    confidence: 'high',
                    rankScore: 1,
                    tags: ['RECOMMENDED'],
                },
            ],
            recommendation: 'opt-1',
            expiresAt,
        });
    };

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('rejects expired quote session lookups', async () => {
        const session = await createQuoteSession(new Date(Date.now() - 5 * 60 * 1000));
        const sessionId = String(session._id);

        await expect(
            QuoteEngineService.getSelectedOption(
                companyId.toString(),
                sellerId.toString(),
                sessionId,
                'opt-1'
            )
        ).rejects.toMatchObject({
            code: ErrorCode.BIZ_INVALID_STATE,
            statusCode: 410,
        });
    });

    it('books shipment from quote and locks selected option into session', async () => {
        const order = await createBaseOrder();
        const session = await createQuoteSession(new Date(Date.now() + 30 * 60 * 1000));
        const sessionId = String(session._id);
        const orderId = String(order._id);

        const validateSpy = jest
            .spyOn(ShipmentService, 'validateOrderForShipment')
            .mockReturnValue({ canCreate: true });
        const activeSpy = jest
            .spyOn(ShipmentService, 'hasActiveShipment')
            .mockResolvedValue(false);
        const createSpy = jest
            .spyOn(ShipmentService, 'createShipment')
            .mockResolvedValue({
                shipment: { _id: new mongoose.Types.ObjectId(), trackingNumber: 'TRK-BOOK-1' } as any,
                carrierSelection: {
                    selectedCarrier: 'ekart',
                    selectedRate: 120,
                    selectedDeliveryTime: 4,
                    alternativeOptions: [],
                },
                updatedOrder: order as any,
            });

        const result = await BookFromQuoteService.execute({
            companyId: companyId.toString(),
            sellerId: sellerId.toString(),
            userId: userId.toString(),
            sessionId,
            optionId: 'opt-1',
            orderId,
            instructions: 'Handle with care',
        });

        expect(validateSpy).toHaveBeenCalled();
        expect(activeSpy).toHaveBeenCalled();
        expect(createSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: expect.objectContaining({
                    carrierOverride: 'ekart',
                }),
                pricingDetails: expect.objectContaining({
                    selectedQuote: expect.objectContaining({
                        optionId: 'opt-1',
                        quotedSellAmount: 120,
                        expectedCostAmount: 100,
                    }),
                }),
            })
        );
        expect(result.pricingSnapshot).toEqual(
            expect.objectContaining({
                quotedAmount: 120,
                expectedCost: 100,
                expectedMargin: 20,
            })
        );

        const savedSession = await QuoteSession.findById(session._id).lean();
        expect(savedSession?.selectedOptionId).toBe('opt-1');
    });

    it('rejects booking when quote session is expired and does not create shipment', async () => {
        const order = await createBaseOrder();
        const session = await createQuoteSession(new Date(Date.now() - 60 * 1000));
        const sessionId = String(session._id);
        const orderId = String(order._id);

        const createSpy = jest.spyOn(ShipmentService, 'createShipment');

        await expect(
            BookFromQuoteService.execute({
                companyId: companyId.toString(),
                sellerId: sellerId.toString(),
                userId: userId.toString(),
                sessionId,
                optionId: 'opt-1',
                orderId,
            })
        ).rejects.toMatchObject({
            code: ErrorCode.BIZ_INVALID_STATE,
            statusCode: 410,
        });

        expect(createSpy).not.toHaveBeenCalled();
    });

    it('creates open variance case when billed cost exceeds threshold', async () => {
        const order = await createBaseOrder();
        const awb = 'AWB-VARIANCE-001';

        await Shipment.create({
            trackingNumber: awb,
            orderId: order._id,
            companyId,
            carrier: 'ekart',
            serviceType: 'standard',
            packageDetails: {
                weight: 0.5,
                dimensions: {
                    length: 10,
                    width: 10,
                    height: 10,
                },
                packageCount: 1,
                packageType: 'box',
                declaredValue: 1000,
            },
            deliveryDetails: {
                recipientName: 'Test Customer',
                recipientPhone: '9999999999',
                address: {
                    line1: 'Test Line 1',
                    city: 'Delhi',
                    state: 'Delhi',
                    country: 'India',
                    postalCode: '110001',
                },
            },
            paymentDetails: {
                type: 'prepaid',
                shippingCost: 100,
                currency: 'INR',
            },
            pricingDetails: {
                selectedQuote: {
                    expectedCostAmount: 100,
                },
            },
            statusHistory: [],
            currentStatus: 'created',
            weights: {
                declared: {
                    value: 0.5,
                    unit: 'kg',
                },
                verified: false,
            },
            documents: [],
            isDeleted: false,
        });

        const summary = await CarrierBillingReconciliationService.importRecords({
            companyId: companyId.toString(),
            userId: userId.toString(),
            thresholdPercent: 5,
            records: [
                {
                    provider: 'ekart',
                    awb,
                    billedTotal: 120,
                    source: 'manual',
                    billedAt: new Date(),
                },
            ],
        });

        expect(summary.importedCount).toBe(1);
        expect(summary.matchedShipmentCount).toBe(1);
        expect(summary.openCaseCount).toBe(1);
        expect(summary.autoClosedCount).toBe(0);
        expect(summary.varianceCaseIds).toHaveLength(1);

        const billingRecord = await CarrierBillingRecord.findOne({ companyId, awb }).lean();
        expect(billingRecord).toBeTruthy();

        const varianceCase = await PricingVarianceCase.findById(summary.varianceCaseIds[0]).lean();
        expect(varianceCase).toBeTruthy();
        expect(varianceCase?.status).toBe('open');
        expect(Math.round((varianceCase?.variancePercent || 0) * 100) / 100).toBe(20);
        expect(varianceCase?.expectedCost).toBe(100);
        expect(varianceCase?.billedCost).toBe(120);
    });

    it('auto-closes variance case when billed cost is within threshold', async () => {
        const order = await createBaseOrder();
        const awb = 'AWB-VARIANCE-002';

        await Shipment.create({
            trackingNumber: awb,
            orderId: order._id,
            companyId,
            carrier: 'delhivery',
            serviceType: 'standard',
            packageDetails: {
                weight: 0.5,
                dimensions: {
                    length: 10,
                    width: 10,
                    height: 10,
                },
                packageCount: 1,
                packageType: 'box',
                declaredValue: 1000,
            },
            deliveryDetails: {
                recipientName: 'Test Customer',
                recipientPhone: '9999999999',
                address: {
                    line1: 'Test Line 1',
                    city: 'Delhi',
                    state: 'Delhi',
                    country: 'India',
                    postalCode: '110001',
                },
            },
            paymentDetails: {
                type: 'prepaid',
                shippingCost: 100,
                currency: 'INR',
            },
            pricingDetails: {
                selectedQuote: {
                    expectedCostAmount: 100,
                },
            },
            statusHistory: [],
            currentStatus: 'created',
            weights: {
                declared: {
                    value: 0.5,
                    unit: 'kg',
                },
                verified: false,
            },
            documents: [],
            isDeleted: false,
        });

        const summary = await CarrierBillingReconciliationService.importRecords({
            companyId: companyId.toString(),
            userId: userId.toString(),
            thresholdPercent: 5,
            records: [
                {
                    provider: 'delhivery',
                    awb,
                    billedTotal: 104,
                    source: 'manual',
                    billedAt: new Date(),
                },
            ],
        });

        expect(summary.importedCount).toBe(1);
        expect(summary.matchedShipmentCount).toBe(1);
        expect(summary.autoClosedCount).toBe(1);
        expect(summary.openCaseCount).toBe(0);
        expect(summary.varianceCaseIds).toHaveLength(1);

        const varianceCase = await PricingVarianceCase.findById(summary.varianceCaseIds[0]).lean();
        expect(varianceCase?.status).toBe('resolved');
        expect(varianceCase?.resolution?.outcome).toBe('auto_closed_within_threshold');
        expect(Math.round((varianceCase?.variancePercent || 0) * 100) / 100).toBe(4);
    });

    it('marks shipment as booking_failed and refunds wallet on booking failure before AWB', async () => {
        const order = await createBaseOrder();
        const session = await createQuoteSession(new Date(Date.now() + 30 * 60 * 1000));

        const stagedShipment = await Shipment.create({
            trackingNumber: `PRE-AWB-${Date.now()}`,
            orderId: order._id,
            companyId,
            carrier: 'ekart',
            serviceType: 'standard',
            packageDetails: {
                weight: 0.5,
                dimensions: { length: 10, width: 10, height: 10 },
                packageCount: 1,
                packageType: 'box',
                declaredValue: 1000,
            },
            deliveryDetails: {
                recipientName: 'Compensation Customer',
                recipientPhone: '9999999999',
                address: {
                    line1: 'Test Line 1',
                    city: 'Delhi',
                    state: 'Delhi',
                    country: 'India',
                    postalCode: '110001',
                },
            },
            paymentDetails: {
                type: 'prepaid',
                shippingCost: 100,
                currency: 'INR',
            },
            pricingDetails: {
                selectedQuote: {
                    quoteSessionId: session._id,
                    optionId: 'opt-1',
                    expectedCostAmount: 100,
                },
            },
            walletTransactionId: new mongoose.Types.ObjectId(),
            statusHistory: [],
            currentStatus: 'created',
            weights: {
                declared: { value: 0.5, unit: 'kg' },
                verified: false,
            },
            documents: [],
            isDeleted: false,
        });

        jest.spyOn(ShipmentService, 'validateOrderForShipment').mockReturnValue({ canCreate: true });
        jest.spyOn(ShipmentService, 'hasActiveShipment').mockResolvedValue(false);
        jest.spyOn(ShipmentService, 'createShipment').mockRejectedValue(new Error('booking failed before awb'));
        const refundSpy = jest.spyOn(WalletService, 'refund').mockResolvedValue({
            success: true,
            transactionId: 'refund-1',
            newBalance: 1000,
        });

        await expect(
            BookFromQuoteService.execute({
                companyId: companyId.toString(),
                sellerId: sellerId.toString(),
                userId: userId.toString(),
                sessionId: String(session._id),
                optionId: 'opt-1',
                orderId: String(order._id),
            })
        ).rejects.toThrow('booking failed before awb');

        const updated = await Shipment.findById(stagedShipment._id).lean();
        expect(updated?.currentStatus).toBe('booking_failed');
        expect(updated?.statusHistory[updated.statusHistory.length - 1]?.status).toBe('booking_failed');
        expect(refundSpy).toHaveBeenCalled();
    });

    it('marks shipment as booking_partial when failure occurs after AWB assignment', async () => {
        const order = await createBaseOrder();
        const session = await createQuoteSession(new Date(Date.now() + 30 * 60 * 1000));

        const stagedShipment = await Shipment.create({
            trackingNumber: `POST-AWB-${Date.now()}`,
            orderId: order._id,
            companyId,
            carrier: 'delhivery',
            serviceType: 'express',
            packageDetails: {
                weight: 0.5,
                dimensions: { length: 10, width: 10, height: 10 },
                packageCount: 1,
                packageType: 'box',
                declaredValue: 1000,
            },
            deliveryDetails: {
                recipientName: 'Compensation Customer',
                recipientPhone: '9999999999',
                address: {
                    line1: 'Test Line 1',
                    city: 'Delhi',
                    state: 'Delhi',
                    country: 'India',
                    postalCode: '110001',
                },
            },
            paymentDetails: {
                type: 'prepaid',
                shippingCost: 100,
                currency: 'INR',
            },
            pricingDetails: {
                selectedQuote: {
                    quoteSessionId: session._id,
                    optionId: 'opt-1',
                    expectedCostAmount: 100,
                },
            },
            carrierDetails: {
                carrierTrackingNumber: 'AWB-POST-123',
            },
            walletTransactionId: new mongoose.Types.ObjectId(),
            statusHistory: [],
            currentStatus: 'pending_pickup',
            weights: {
                declared: { value: 0.5, unit: 'kg' },
                verified: false,
            },
            documents: [],
            isDeleted: false,
        });

        jest.spyOn(ShipmentService, 'validateOrderForShipment').mockReturnValue({ canCreate: true });
        jest.spyOn(ShipmentService, 'hasActiveShipment').mockResolvedValue(false);
        jest.spyOn(ShipmentService, 'createShipment').mockRejectedValue(new Error('booking failed after awb'));
        const refundSpy = jest.spyOn(WalletService, 'refund').mockResolvedValue({
            success: true,
            transactionId: 'refund-2',
            newBalance: 1200,
        });

        await expect(
            BookFromQuoteService.execute({
                companyId: companyId.toString(),
                sellerId: sellerId.toString(),
                userId: userId.toString(),
                sessionId: String(session._id),
                optionId: 'opt-1',
                orderId: String(order._id),
            })
        ).rejects.toThrow('booking failed after awb');

        const updated = await Shipment.findById(stagedShipment._id).lean();
        expect(updated?.currentStatus).toBe('booking_partial');
        expect(updated?.statusHistory[updated.statusHistory.length - 1]?.status).toBe('booking_partial');
        expect(refundSpy).toHaveBeenCalled();
    });
});
