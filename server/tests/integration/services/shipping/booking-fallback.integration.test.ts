import mongoose from 'mongoose';
import BookFromQuoteService from '@/core/application/services/shipping/book-from-quote.service';
import { ShipmentService } from '@/core/application/services/shipping/shipment.service';
import ServiceLevelPricingMetricsService from '@/core/application/services/metrics/service-level-pricing-metrics.service';
import { Order, QuoteSession } from '@/infrastructure/database/mongoose/models';
import { AppError } from '@/shared/errors/app.error';
import { ErrorCode } from '@/shared/errors/errorCodes';

describe('Booking Fallback Integration', () => {
    const companyId = new mongoose.Types.ObjectId();
    const sellerId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    const createOrder = async () =>
        Order.create({
            orderNumber: `BOOK-FALLBACK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            companyId,
            customerInfo: {
                name: 'Fallback Tester',
                phone: '9999999999',
                address: {
                    line1: 'Fallback Lane',
                    city: 'Bangalore',
                    state: 'Karnataka',
                    country: 'India',
                    postalCode: '560001',
                },
            },
            products: [{ name: 'Product', quantity: 1, price: 1000, weight: 0.5 }],
            shippingDetails: { shippingCost: 0 },
            paymentStatus: 'pending',
            paymentMethod: 'prepaid',
            source: 'manual',
            currentStatus: 'pending',
            statusHistory: [],
            totals: { subtotal: 1000, tax: 0, shipping: 0, discount: 0, total: 1000 },
            isDeleted: false,
        });

    const createQuoteSession = async () =>
        QuoteSession.create({
            companyId,
            sellerId,
            input: {
                fromPincode: '560001',
                toPincode: '110001',
                weight: 0.5,
                dimensions: { length: 10, width: 10, height: 10 },
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
                    rankScore: 0.92,
                    tags: ['RECOMMENDED'],
                },
                {
                    optionId: 'opt-2',
                    provider: 'delhivery',
                    serviceName: 'Delhivery Surface',
                    chargeableWeight: 0.5,
                    zone: 'zoneD',
                    quotedAmount: 125,
                    costAmount: 102,
                    estimatedMargin: 23,
                    estimatedMarginPercent: 18.4,
                    pricingSource: 'table',
                    confidence: 'high',
                    rankScore: 0.88,
                    tags: [],
                },
                {
                    optionId: 'opt-3',
                    provider: 'velocity',
                    serviceName: 'Velocity Surface',
                    chargeableWeight: 0.5,
                    zone: 'zoneD',
                    quotedAmount: 130,
                    costAmount: 105,
                    estimatedMargin: 25,
                    estimatedMarginPercent: 19.2,
                    pricingSource: 'table',
                    confidence: 'medium',
                    rankScore: 0.81,
                    tags: [],
                },
            ],
            recommendation: 'opt-1',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        });

    beforeEach(() => {
        jest.restoreAllMocks();
        ServiceLevelPricingMetricsService.reset();
    });

    it('books successfully on first attempt without fallback', async () => {
        const order = await createOrder();
        const session = await createQuoteSession();

        jest.spyOn(ShipmentService, 'validateOrderForShipment').mockReturnValue({ canCreate: true });
        jest.spyOn(ShipmentService, 'hasActiveShipment').mockResolvedValue(false);
        const createSpy = jest.spyOn(ShipmentService, 'createShipment').mockResolvedValue({
            shipment: { _id: new mongoose.Types.ObjectId(), trackingNumber: 'TRK-1' } as any,
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
            sessionId: String(session._id),
            optionId: 'opt-1',
            orderId: String(order._id),
        });

        expect(result.optionId).toBe('opt-1');
        expect(result.fallbackInfo.fallbackUsed).toBe(false);
        expect(result.fallbackInfo.attemptNumber).toBe(1);
        expect(createSpy).toHaveBeenCalledTimes(1);

        const snapshot = ServiceLevelPricingMetricsService.getSnapshot();
        expect(snapshot.bookings.success).toBe(1);
        expect(snapshot.bookings.fallback.fallbackSuccess).toBe(0);
        expect(snapshot.bookings.fallback.fallbackEvents).toBe(0);
    });

    it('falls back to second option when first attempt fails with recoverable error', async () => {
        const order = await createOrder();
        const session = await createQuoteSession();

        jest.spyOn(ShipmentService, 'validateOrderForShipment').mockReturnValue({ canCreate: true });
        jest.spyOn(ShipmentService, 'hasActiveShipment').mockResolvedValue(false);
        const createSpy = jest
            .spyOn(ShipmentService, 'createShipment')
            .mockRejectedValueOnce(
                new AppError('Provider timeout', ErrorCode.SYS_TIMEOUT, 504)
            )
            .mockResolvedValueOnce({
                shipment: { _id: new mongoose.Types.ObjectId(), trackingNumber: 'TRK-2' } as any,
                carrierSelection: {
                    selectedCarrier: 'delhivery',
                    selectedRate: 125,
                    selectedDeliveryTime: 3,
                    alternativeOptions: [],
                },
                updatedOrder: order as any,
            });

        const result = await BookFromQuoteService.execute({
            companyId: companyId.toString(),
            sellerId: sellerId.toString(),
            userId: userId.toString(),
            sessionId: String(session._id),
            optionId: 'opt-1',
            orderId: String(order._id),
        });

        expect(result.optionId).toBe('opt-2');
        expect(result.fallbackInfo.fallbackUsed).toBe(true);
        expect(result.fallbackInfo.attemptNumber).toBe(2);
        expect(result.fallbackInfo.attemptedOptionIds).toEqual(['opt-1', 'opt-2']);
        expect(createSpy).toHaveBeenCalledTimes(2);

        const idempotencyKeys = createSpy.mock.calls.map((call) => call[0].idempotencyKey);
        expect(idempotencyKeys[0]).not.toBe(idempotencyKeys[1]);
        expect(idempotencyKeys[0]).toContain('-a1');
        expect(idempotencyKeys[1]).toContain('-a2');

        const snapshot = ServiceLevelPricingMetricsService.getSnapshot();
        expect(snapshot.bookings.success).toBe(1);
        expect(snapshot.bookings.failures).toBe(1);
        expect(snapshot.bookings.fallback.fallbackSuccess).toBe(1);
        expect(snapshot.bookings.fallback.fallbackEvents).toBe(1);
    });

    it('falls back across two failures and succeeds on third option', async () => {
        const order = await createOrder();
        const session = await createQuoteSession();

        jest.spyOn(ShipmentService, 'validateOrderForShipment').mockReturnValue({ canCreate: true });
        jest.spyOn(ShipmentService, 'hasActiveShipment').mockResolvedValue(false);
        const createSpy = jest
            .spyOn(ShipmentService, 'createShipment')
            .mockRejectedValueOnce(new AppError('Provider timeout', ErrorCode.SYS_TIMEOUT, 504))
            .mockRejectedValueOnce(new AppError('Service unavailable', ErrorCode.EXT_SERVICE_UNAVAILABLE, 503))
            .mockResolvedValueOnce({
                shipment: { _id: new mongoose.Types.ObjectId(), trackingNumber: 'TRK-3' } as any,
                carrierSelection: {
                    selectedCarrier: 'velocity',
                    selectedRate: 130,
                    selectedDeliveryTime: 3,
                    alternativeOptions: [],
                },
                updatedOrder: order as any,
            });

        const result = await BookFromQuoteService.execute({
            companyId: companyId.toString(),
            sellerId: sellerId.toString(),
            userId: userId.toString(),
            sessionId: String(session._id),
            optionId: 'opt-1',
            orderId: String(order._id),
        });

        expect(result.optionId).toBe('opt-3');
        expect(result.fallbackInfo.fallbackUsed).toBe(true);
        expect(result.fallbackInfo.attemptNumber).toBe(3);
        expect(result.fallbackInfo.attemptedOptionIds).toEqual(['opt-1', 'opt-2', 'opt-3']);
        expect(createSpy).toHaveBeenCalledTimes(3);

        const snapshot = ServiceLevelPricingMetricsService.getSnapshot();
        expect(snapshot.bookings.success).toBe(1);
        expect(snapshot.bookings.failures).toBe(2);
        expect(snapshot.bookings.fallback.fallbackSuccess).toBe(1);
        expect(snapshot.bookings.fallback.fallbackEvents).toBe(2);
    });

    it('throws after all retry options are exhausted', async () => {
        const order = await createOrder();
        const session = await createQuoteSession();

        jest.spyOn(ShipmentService, 'validateOrderForShipment').mockReturnValue({ canCreate: true });
        jest.spyOn(ShipmentService, 'hasActiveShipment').mockResolvedValue(false);
        const createSpy = jest
            .spyOn(ShipmentService, 'createShipment')
            .mockRejectedValue(new AppError('Temporary provider issue', ErrorCode.EXT_SERVICE_UNAVAILABLE, 503));

        await expect(
            BookFromQuoteService.execute({
                companyId: companyId.toString(),
                sellerId: sellerId.toString(),
                userId: userId.toString(),
                sessionId: String(session._id),
                optionId: 'opt-1',
                orderId: String(order._id),
            })
        ).rejects.toBeInstanceOf(AppError);

        expect(createSpy).toHaveBeenCalledTimes(3);
        const snapshot = ServiceLevelPricingMetricsService.getSnapshot();
        expect(snapshot.bookings.fallback.fallbackExhausted).toBeGreaterThan(0);
        expect(snapshot.bookings.fallback.fallbackAttempts).toBeGreaterThan(0);
    });

    it('stops fallback immediately for non-recoverable post-awb error', async () => {
        const order = await createOrder();
        const session = await createQuoteSession();

        jest.spyOn(ShipmentService, 'validateOrderForShipment').mockReturnValue({ canCreate: true });
        jest.spyOn(ShipmentService, 'hasActiveShipment').mockResolvedValue(false);
        const createSpy = jest.spyOn(ShipmentService, 'createShipment').mockRejectedValue({
            message: 'Carrier returned post-awb failure',
            awbGenerated: true,
            carrierTrackingNumber: 'AWB-123',
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
        ).rejects.toBeTruthy();

        expect(createSpy).toHaveBeenCalledTimes(1);
        const snapshot = ServiceLevelPricingMetricsService.getSnapshot();
        expect(snapshot.bookings.fallback.nonRecoverableStops).toBeGreaterThan(0);
        expect(snapshot.bookings.fallback.fallbackEvents).toBe(0);
    });
});
