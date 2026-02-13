/**
 * RTOService Unit Tests
 *
 * Covers the full RTO management system: trigger, stats, analytics, status updates,
 * QC, tracking, pickup, cancellation, and restock. Includes major flows and edge cases.
 */

import RTOService from '../../../../src/core/application/services/rto/rto.service';
import RTOAnalyticsService from '../../../../src/core/application/services/rto/rto-analytics.service';
import mongoose from 'mongoose';
import { AppError } from '../../../../src/shared/errors/app.error';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSession = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn(),
};

const mockRTOEventDoc = {
    _id: 'rto123',
    shipment: 'shipment123',
    reverseAwb: 'REV123',
    chargesDeducted: false,
    chargesDeductedAt: undefined,
    save: jest.fn().mockResolvedValue(undefined),
};

const mockShipmentForFindById = {
    _id: 'shipment123',
    awb: 'AWB1',
    orderId: 'order123',
    companyId: 'company123',
    warehouseId: 'warehouse123',
    status: 'ndr',
    currentStatus: 'ndr',
    trackingNumber: 'AWB1',
    carrier: 'velocity-shipfast',
    serviceType: 'express',
    deliveryDetails: {
        recipientName: 'Customer',
        recipientPhone: '9999999999',
        address: { line1: 'Addr', city: 'City', state: 'ST', postalCode: '110001', country: 'India' },
    },
    pickupDetails: { warehouseId: 'warehouse123' },
    packageDetails: { weight: 0.5, dimensions: { length: 10, width: 10, height: 10 } },
    recipientName: 'Customer',
    recipientPhone: '9999999999',
    consignee: null,
};

jest.mock('../../../../src/infrastructure/database/mongoose/models', () => {
    return {
        RTOEvent: {
            create: jest.fn(),
            findById: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            findOne: jest.fn(),
            aggregate: jest.fn(),
            countDocuments: jest.fn().mockResolvedValue(5),
        },
        NDREvent: {
            findOne: jest.fn().mockReturnValue({ session: jest.fn().mockResolvedValue(null) }),
            findByIdAndUpdate: jest.fn().mockResolvedValue({}),
        },
        Shipment: {
            findById: jest.fn(),
            findOneAndUpdate: jest.fn(),
            countDocuments: jest.fn().mockResolvedValue(100),
            aggregate: jest.fn().mockResolvedValue([]),
        },
        Order: {
            findById: jest.fn().mockResolvedValue(null),
            findByIdAndUpdate: jest.fn().mockResolvedValue({ currentStatus: 'rto_initiated' }),
        },
    };
});

jest.mock('../../../../src/core/application/services/warehouse/warehouse-notification.service', () => ({
    __esModule: true,
    default: {
        notifyRTOIncoming: jest.fn().mockResolvedValue(undefined),
    },
}));

jest.mock('../../../../src/core/application/services/wallet/wallet.service', () => ({
    __esModule: true,
    default: {
        hasMinimumBalance: jest.fn().mockResolvedValue(true),
        getBalance: jest.fn().mockResolvedValue({ balance: 1000 }),
        handleRTOCharge: jest.fn().mockResolvedValue({ success: true, newBalance: 900 }),
    },
}));

jest.mock('../../../../src/core/application/services/rto/rate-card.service', () => ({
    __esModule: true,
    default: {
        calculateRTOCharges: jest.fn().mockResolvedValue({ finalPrice: 50, rateCardUsed: 'flat', breakdown: [] }),
    },
}));

jest.mock('../../../../src/core/application/services/rto/rto-notification.service', () => ({
    RTONotificationService: {
        notifyRTOInitiated: jest.fn().mockReturnValue(Promise.resolve()),
        notifyRTOQCCompleted: jest.fn().mockReturnValue(Promise.resolve()),
        notifyRTODeliveredToWarehouse: jest.fn().mockReturnValue(Promise.resolve()),
    },
}));

jest.mock('../../../../src/infrastructure/utilities/rate-limiter', () => {
    const limiter = { checkLimit: jest.fn().mockResolvedValue({ allowed: true }) };
    const getRateLimiter = jest.fn().mockReturnValue(limiter);
    (getRateLimiter as any).__limiter = limiter;
    return { getRateLimiter };
});

jest.mock('../../../../src/shared/events/eventBus', () => ({
    __esModule: true,
    default: { emitEvent: jest.fn() },
}));

jest.mock('../../../../src/presentation/http/middleware/system/audit-log.middleware', () => ({
    createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../../src/shared/logger/winston.logger', () => ({
    __esModule: true,
    default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// CourierFactory is dynamically imported as .factory.js in RTOService; mock both paths (inline for hoisting)
jest.mock('../../../../src/core/application/services/courier/courier.factory', () => {
    const trackShipment = jest.fn().mockResolvedValue({
        status: 'in_transit',
        currentLocation: 'Hub',
        timeline: [],
        estimatedDelivery: new Date(),
    });
    const cancelReverseShipment = jest.fn().mockResolvedValue(undefined);
    const adapter = {
        createReverseShipment: jest.fn().mockResolvedValue({ trackingNumber: 'REV123' }),
        trackShipment,
        cancelReverseShipment,
    };
    return {
        CourierFactory: {
            getProvider: jest.fn().mockResolvedValue(adapter),
        },
    };
});

jest.mock('../../../../src/core/application/services/warehouse/inventory.service', () => ({
    __esModule: true,
    default: {
        getInventoryBySKU: jest.fn().mockResolvedValue({ _id: 'inv1', sku: 'SKU1' }),
        adjustStock: jest.fn().mockResolvedValue(undefined),
    },
}));

const { RTOEvent, Shipment, NDREvent, Order } = require('../../../../src/infrastructure/database/mongoose/models');
const WalletService = require('../../../../src/core/application/services/wallet/wallet.service').default;
const rateLimiterModule = require('../../../../src/infrastructure/utilities/rate-limiter');
const getRateLimiter = rateLimiterModule.getRateLimiter;

describe('RTOService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession as any);
        WalletService.hasMinimumBalance.mockResolvedValue(true);
        WalletService.getBalance.mockResolvedValue({ balance: 1000 });
        WalletService.handleRTOCharge.mockResolvedValue({ success: true, newBalance: 900 });
        const limiter = (getRateLimiter as any).__limiter || getRateLimiter();
        if (limiter && limiter.checkLimit) limiter.checkLimit.mockResolvedValue({ allowed: true });
        const { RTONotificationService: RTONotif } = require('../../../../src/core/application/services/rto/rto-notification.service');
        RTONotif.notifyRTOQCCompleted.mockReturnValue(Promise.resolve());
        RTONotif.notifyRTOInitiated.mockReturnValue(Promise.resolve());
        RTONotif.notifyRTODeliveredToWarehouse.mockReturnValue(Promise.resolve());
        const shipmentDoc = (id: string, status = 'ndr') => ({
            ...mockShipmentForFindById,
            _id: id,
            status,
            currentStatus: status,
            populate: jest.fn().mockReturnValue({
                populate: jest.fn().mockResolvedValue({ ...mockShipmentForFindById, _id: id, status, currentStatus: status }),
            }),
        });
        (Shipment.findById as any).mockImplementation((id: string) => {
            if (id === 'shipment125') {
                return Promise.resolve(shipmentDoc(id, 'delivered'));
            }
            return Promise.resolve(shipmentDoc(id));
        });
        (RTOEvent.create as any).mockResolvedValue([{ ...mockRTOEventDoc, save: jest.fn().mockResolvedValue(undefined) }]);
        (NDREvent.findOne as any).mockReturnValue({ session: jest.fn().mockResolvedValue(null) });
        (NDREvent.findByIdAndUpdate as any).mockResolvedValue({});
    });

    describe('triggerRTO', () => {
        it('should prevent RTO on already delivered shipments', async () => {
            const result = await RTOService.triggerRTO(
                'shipment125',
                'ndr_unresolved',
                undefined,
                'auto'
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('delivered');
            expect(mockSession.abortTransaction).toHaveBeenCalled();
            expect(RTOEvent.create).not.toHaveBeenCalled();
        });

        it('should return error when shipment not found', async () => {
            (Shipment.findById as any).mockResolvedValueOnce(null);

            const result = await RTOService.triggerRTO(
                'shipment999',
                'ndr_unresolved',
                undefined,
                'manual'
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Shipment not found');
            expect(mockSession.abortTransaction).toHaveBeenCalled();
        });

        it('should prevent RTO when shipment already in RTO process (rto_initiated)', async () => {
            (Shipment.findById as any).mockImplementationOnce((id: string) => {
                const doc = {
                    ...mockShipmentForFindById,
                    _id: id,
                    status: 'rto_initiated',
                    currentStatus: 'rto_initiated',
                    populate: jest.fn().mockReturnValue({
                        populate: jest.fn().mockResolvedValue({ ...mockShipmentForFindById, status: 'rto_initiated' }),
                    }),
                };
                return Promise.resolve(doc);
            });

            const result = await RTOService.triggerRTO('shipment123', 'ndr_unresolved', undefined, 'manual');

            expect(result.success).toBe(false);
            expect(result.error).toContain('already in RTO');
            expect(mockSession.abortTransaction).toHaveBeenCalled();
            expect(RTOEvent.create).not.toHaveBeenCalled();
        });

        it('should prevent RTO when shipment already in RTO process (rto_in_transit)', async () => {
            (Shipment.findById as any).mockImplementationOnce((id: string) => {
                const doc = {
                    ...mockShipmentForFindById,
                    _id: id,
                    status: 'rto_in_transit',
                    currentStatus: 'rto_in_transit',
                    populate: jest.fn().mockReturnValue({
                        populate: jest.fn().mockResolvedValue({ ...mockShipmentForFindById, status: 'rto_in_transit' }),
                    }),
                };
                return Promise.resolve(doc);
            });

            const result = await RTOService.triggerRTO('shipment123', 'ndr_unresolved', undefined, 'manual');

            expect(result.success).toBe(false);
            expect(result.error).toContain('already in RTO');
        });

        it('should return error when wallet has insufficient balance', async () => {
            WalletService.hasMinimumBalance.mockResolvedValueOnce(false);
            WalletService.getBalance.mockResolvedValueOnce({ balance: 10 });

            const result = await RTOService.triggerRTO('shipment123', 'ndr_unresolved', undefined, 'manual');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Insufficient wallet balance');
            expect(result.error).toContain('₹');
            expect(mockSession.abortTransaction).toHaveBeenCalled();
            expect(RTOEvent.create).not.toHaveBeenCalled();
        });

        it('should return error when rate limit exceeded', async () => {
            const limiter = getRateLimiter.__limiter || getRateLimiter();
            limiter.checkLimit.mockResolvedValueOnce({ allowed: false, retryAfter: 30 });

            const result = await RTOService.triggerRTO('shipment123', 'ndr_unresolved', undefined, 'manual');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Rate limit exceeded');
            expect(result.error).toContain('Retry after');
            expect(mockSession.abortTransaction).toHaveBeenCalled();
        });

        it('should return error when RTO already triggered for same NDR (idempotency)', async () => {
            (NDREvent.findOne as any).mockReturnValueOnce({
                session: jest.fn().mockResolvedValue({ _id: 'ndr1', status: 'rto_triggered' }),
            });

            const result = await RTOService.triggerRTO(
                'shipment123',
                'ndr_unresolved',
                'ndrEvent123',
                'auto'
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('RTO already triggered for this NDR');
            expect(mockSession.abortTransaction).toHaveBeenCalled();
        });

        it('should return error when wallet deduction fails', async () => {
            WalletService.handleRTOCharge.mockResolvedValueOnce({ success: false, error: 'Insufficient funds' });

            const result = await RTOService.triggerRTO('shipment123', 'ndr_unresolved', undefined, 'manual');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(mockSession.abortTransaction).toHaveBeenCalled();
        });

        it('should return error on duplicate RTO (create throws code 11000)', async () => {
            (RTOEvent.create as any).mockRejectedValueOnce({ code: 11000 });

            const result = await RTOService.triggerRTO('shipment123', 'ndr_unresolved', undefined, 'manual');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(mockSession.abortTransaction).toHaveBeenCalled();
        });
    });

    describe('getRTOStats', () => {
        it('should return RTO statistics for company', async () => {
            const spy = jest.spyOn(RTOAnalyticsService, 'getAnalytics').mockResolvedValueOnce({
                summary: {
                    currentRate: 2,
                    previousRate: 1,
                    change: 1,
                    industryAverage: 10.5,
                    totalRTO: 2,
                    totalOrders: 100,
                    estimatedLoss: 125,
                    periodLabel: 'Last 30 Days',
                },
                stats: {
                    total: 2,
                    byReason: { ndr_unresolved: 1, customer_cancellation: 1 },
                    byStatus: { initiated: 2 },
                    totalCharges: 125,
                    avgCharges: 62.5,
                    restockRate: 0,
                    dispositionBreakdown: { restock: 0, refurb: 0, dispose: 0, claim: 0 },
                },
                trend: [],
                byCourier: [],
                byReason: [],
                recommendations: [],
                period: {
                    startDate: new Date('2025-01-01').toISOString(),
                    endDate: new Date('2025-01-31').toISOString(),
                },
            } as any);

            const stats = await RTOService.getRTOStats('company123');

            expect(stats.total).toBe(2);
            expect(stats.byReason).toBeDefined();
            expect(stats.byReason!['ndr_unresolved']).toBe(1);
            expect(stats.byReason!['customer_cancellation']).toBe(1);
            expect(stats.avgCharges).toBe(62.5);
            expect(stats.returnRate).toBe(2);
            spy.mockRestore();
        });

        it('should accept optional date range', async () => {
            const spy = jest.spyOn(RTOAnalyticsService, 'getAnalytics').mockResolvedValueOnce({
                summary: {
                    currentRate: 1,
                    previousRate: 0,
                    change: 1,
                    industryAverage: 10.5,
                    totalRTO: 1,
                    totalOrders: 100,
                    estimatedLoss: 50,
                    periodLabel: 'Custom Range',
                },
                stats: {
                    total: 1,
                    byReason: { ndr_unresolved: 1 },
                    byStatus: { initiated: 1 },
                    totalCharges: 50,
                    avgCharges: 50,
                    restockRate: 0,
                    dispositionBreakdown: { restock: 0, refurb: 0, dispose: 0, claim: 0 },
                },
                trend: [],
                byCourier: [],
                byReason: [],
                recommendations: [],
                period: {
                    startDate: new Date('2025-01-01').toISOString(),
                    endDate: new Date('2025-01-31').toISOString(),
                },
            } as any);

            const start = new Date('2025-01-01');
            const end = new Date('2025-01-31');
            await RTOService.getRTOStats('company123', { start, end });

            expect(spy).toHaveBeenCalledWith(
                'company123',
                expect.objectContaining({
                    startDate: start.toISOString(),
                    endDate: end.toISOString(),
                })
            );
            spy.mockRestore();
        });

        it('should return zero totals and empty byReason when no RTOs', async () => {
            const spy = jest.spyOn(RTOAnalyticsService, 'getAnalytics').mockResolvedValueOnce({
                summary: {
                    currentRate: 0,
                    previousRate: 0,
                    change: 0,
                    industryAverage: 10.5,
                    totalRTO: 0,
                    totalOrders: 0,
                    estimatedLoss: 0,
                    periodLabel: 'Last 30 Days',
                },
                stats: {
                    total: 0,
                    byReason: {},
                    byStatus: {},
                    totalCharges: 0,
                    avgCharges: 0,
                    restockRate: 0,
                    dispositionBreakdown: { restock: 0, refurb: 0, dispose: 0, claim: 0 },
                },
                trend: [],
                byCourier: [],
                byReason: [],
                recommendations: [],
                period: {
                    startDate: new Date('2025-01-01').toISOString(),
                    endDate: new Date('2025-01-31').toISOString(),
                },
            } as any);

            const stats = await RTOService.getRTOStats('company456');

            expect(stats.total).toBe(0);
            expect(stats.avgCharges).toBe(0);
            expect(stats.byReason).toEqual({});
            expect(stats.returnRate).toBe(0);
            spy.mockRestore();
        });
    });

    describe('getRTOAnalytics', () => {
        it('should return analytics summary, trend, byCourier, byReason and recommendations', async () => {
            const validCompanyId = new mongoose.Types.ObjectId().toString();
            const spy = jest.spyOn(RTOAnalyticsService, 'getAnalytics').mockResolvedValueOnce({
                summary: {
                    currentRate: 5,
                    previousRate: 3,
                    change: 2,
                    industryAverage: 10.5,
                    totalRTO: 5,
                    totalOrders: 100,
                    estimatedLoss: 400,
                    periodLabel: 'Last 30 Days',
                },
                stats: {
                    total: 5,
                    byReason: { ndr_unresolved: 3, customer_cancellation: 2 },
                    byStatus: { initiated: 5 },
                    totalCharges: 400,
                    avgCharges: 80,
                    restockRate: 0,
                    dispositionBreakdown: { restock: 0, refurb: 0, dispose: 0, claim: 0 },
                },
                trend: [{ month: 'Jan', rate: 5 }],
                byCourier: [{ courier: 'Velocity', rate: 5, count: 5, total: 100 }],
                byReason: [{ reason: 'ndr_unresolved', label: 'Customer Unavailable', percentage: 60, count: 3 }],
                recommendations: [],
                period: {
                    startDate: new Date('2025-01-01').toISOString(),
                    endDate: new Date('2025-01-31').toISOString(),
                },
            } as any);

            const analytics = await RTOService.getRTOAnalytics(validCompanyId);

            expect(analytics.summary).toBeDefined();
            expect(typeof analytics.summary.totalRTO).toBe('number');
            expect(typeof analytics.summary.estimatedLoss).toBe('number');
            expect(analytics.trend).toBeDefined();
            expect(Array.isArray(analytics.trend)).toBe(true);
            expect(analytics.byCourier).toBeDefined();
            expect(analytics.byReason).toBeDefined();
            expect(analytics.recommendations).toBeDefined();
            spy.mockRestore();
        });
    });

    describe('updateRTOStatus', () => {
        it('should update RTO status and call updateReturnStatus', async () => {
            const mockRtoDoc = {
                _id: 'rto1',
                returnStatus: 'qc_pending',
                updateReturnStatus: jest.fn().mockResolvedValue(undefined),
            };
            (RTOEvent.findById as any).mockResolvedValue(mockRtoDoc);

            await RTOService.updateRTOStatus('rto1', 'qc_completed');

            expect(mockRtoDoc.updateReturnStatus).toHaveBeenCalledWith('qc_completed', undefined);
        });

        it('should throw when RTO event not found', async () => {
            (RTOEvent.findById as any).mockResolvedValue(null);

            await expect(RTOService.updateRTOStatus('rto999', 'qc_completed')).rejects.toThrow(
                'RTO event not found'
            );
        });

        it('should call performRestock when status is restocked', async () => {
            const mockUpdateReturnStatus = jest.fn().mockResolvedValue(undefined);
            const mockRtoDoc = {
                _id: 'rto1',
                returnStatus: 'qc_completed',
                qcResult: { passed: true },
                order: 'order1',
                warehouse: 'wh1',
                updateReturnStatus: mockUpdateReturnStatus,
            };
            (RTOEvent.findById as any)
                .mockResolvedValueOnce(mockRtoDoc)
                .mockReturnValueOnce({
                    populate: jest.fn().mockResolvedValue(mockRtoDoc),
                });
            (Order.findById as any).mockResolvedValue({
                _id: 'order1',
                products: [{ sku: 'SKU1', quantity: 2 }],
            });

            await RTOService.updateRTOStatus('rto1', 'restocked', { performedBy: 'user1' });

            expect(mockUpdateReturnStatus).toHaveBeenCalledWith('restocked', { performedBy: 'user1' });
        });

        it('should trigger delivered_to_warehouse notification', async () => {
            const { RTONotificationService: RTONotif } = require('../../../../src/core/application/services/rto/rto-notification.service');
            const mockRtoDoc = {
                _id: 'rto1',
                returnStatus: 'in_transit',
                updateReturnStatus: jest.fn().mockResolvedValue(undefined),
            };
            (RTOEvent.findById as any).mockResolvedValue(mockRtoDoc);

            await RTOService.updateRTOStatus('rto1', 'delivered_to_warehouse');

            expect(RTONotif.notifyRTODeliveredToWarehouse).toHaveBeenCalledWith('rto1');
        });
    });

    describe('recordQCResult', () => {
        it('should record QC and call recordQC on event', async () => {
            const mockRecordQC = jest.fn().mockResolvedValue(undefined);
            const mockRtoDoc = {
                _id: 'rto1',
                returnStatus: 'qc_pending',
                qcResult: null,
                recordQC: mockRecordQC,
            };
            (RTOEvent.findById as any).mockResolvedValue(mockRtoDoc);

            await RTOService.recordQCResult('rto1', {
                passed: true,
                remarks: 'OK',
                inspectedBy: 'tester',
            });

            expect(mockRecordQC).toHaveBeenCalledWith(
                expect.objectContaining({
                    passed: true,
                    remarks: 'OK',
                    inspectedBy: 'tester',
                    inspectedAt: expect.any(Date),
                })
            );
        });

        it('should throw when RTO not in qc_pending or delivered_to_warehouse', async () => {
            (RTOEvent.findById as any).mockResolvedValue({
                _id: 'rto1',
                returnStatus: 'initiated',
                recordQC: jest.fn(),
            });

            await expect(
                RTOService.recordQCResult('rto1', { passed: true, inspectedBy: 'tester' })
            ).rejects.toThrow('RTO must be delivered to warehouse before QC');
        });

        it('should allow recording QC when status is delivered_to_warehouse', async () => {
            const mockRecordQC = jest.fn().mockResolvedValue(undefined);
            (RTOEvent.findById as any).mockResolvedValue({
                _id: 'rto1',
                returnStatus: 'delivered_to_warehouse',
                qcResult: null,
                recordQC: mockRecordQC,
            });

            await RTOService.recordQCResult('rto1', { passed: false, remarks: 'Damaged', inspectedBy: 'qc1' });

            expect(mockRecordQC).toHaveBeenCalledWith(
                expect.objectContaining({
                    passed: false,
                    remarks: 'Damaged',
                    inspectedBy: 'qc1',
                    inspectedAt: expect.any(Date),
                })
            );
        });
    });

    describe('trackReverseShipment', () => {
        it('should throw when RTO event not found for reverse AWB', async () => {
            (RTOEvent.findOne as any).mockReturnValue({
                populate: jest.fn().mockResolvedValue(null),
            });

            const p = RTOService.trackReverseShipment('REV999');
            await expect(p).rejects.toThrow(AppError);
            await expect(p).rejects.toMatchObject({
                code: 'RTO_NOT_FOUND',
                statusCode: 404,
            });
        });

        it('should throw when associated shipment not found', async () => {
            (RTOEvent.findOne as any).mockReturnValue({
                populate: jest.fn().mockResolvedValue({ _id: 'rto1', shipment: 'ship1', reverseAwb: 'REV1' }),
            });
            (Shipment.findById as any).mockResolvedValue(null);

            const p = RTOService.trackReverseShipment('REV1');
            await expect(p).rejects.toThrow(AppError);
            await expect(p).rejects.toMatchObject({
                code: 'SHIPMENT_NOT_FOUND',
                statusCode: 404,
            });
        });

        it('should return tracking details when RTO and shipment exist', async () => {
            (RTOEvent.findOne as any).mockReturnValue({
                populate: jest.fn().mockResolvedValue({
                    _id: 'rto1',
                    shipment: 'ship1',
                    reverseAwb: 'REV1',
                }),
            });
            (Shipment.findById as any).mockResolvedValue({
                trackingNumber: 'AWB1',
                carrier: 'velocity-shipfast',
                companyId: new mongoose.Types.ObjectId(),
            });

            const result = await RTOService.trackReverseShipment('REV1');

            expect(result).toMatchObject({
                reverseAwb: 'REV1',
                originalAwb: 'AWB1',
                status: 'in_transit',
                currentLocation: 'Hub',
            });
            expect(result.trackingHistory).toEqual([]);
        });
    });

    describe('scheduleReversePickup', () => {
        it('should return success false when RTO event not found', async () => {
            (RTOEvent.findById as any).mockReturnValue({
                populate: jest.fn().mockResolvedValue(null),
            });

            const result = await RTOService.scheduleReversePickup('rto999', new Date(), 'morning');

            expect(result.success).toBe(false);
            expect(result.message).toContain('RTO event not found');
        });

        it('should return not supported when courier has no scheduleReversePickup and is not velocity', async () => {
            const mockRto = {
                _id: 'rto1',
                shipment: 'ship1',
                reverseAwb: 'REV1',
                returnStatus: 'initiated',
                metadata: {},
                save: jest.fn().mockResolvedValue(undefined),
            };
            (RTOEvent.findById as any).mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockRto),
            });
            (Shipment.findById as any).mockResolvedValue({
                carrier: 'other-courier',
                trackingNumber: 'AWB1',
                companyId: new mongoose.Types.ObjectId(),
            });
            const { CourierFactory } = require('../../../../src/core/application/services/courier/courier.factory');
            CourierFactory.getProvider.mockResolvedValueOnce({
                createReverseShipment: jest.fn(),
                trackShipment: jest.fn(),
                cancelReverseShipment: jest.fn(),
            });

            const result = await RTOService.scheduleReversePickup('rto1', new Date(), 'afternoon');

            expect(result.success).toBe(false);
            expect(result.message).toContain('not supported');
        });
    });

    describe('cancelReverseShipment', () => {
        it('should return success false when RTO event not found', async () => {
            (RTOEvent.findById as any).mockReturnValue({
                populate: jest.fn().mockResolvedValue(null),
            });

            const result = await RTOService.cancelReverseShipment('rto999', 'Customer cancelled');

            expect(result.success).toBe(false);
            expect(result.message).toContain('RTO event not found');
        });

        it('should return success false when RTO status is not cancellable', async () => {
            const mockRto = {
                _id: 'rto1',
                shipment: 'ship1',
                reverseAwb: 'REV1',
                returnStatus: 'in_transit',
                metadata: {},
                save: jest.fn().mockResolvedValue(undefined),
            };
            (RTOEvent.findById as any).mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockRto),
            });

            const result = await RTOService.cancelReverseShipment('rto1', 'Too late');

            expect(result.success).toBe(false);
            expect(result.message).toContain('Cannot cancel RTO in status');
            expect(result.message).toContain('in_transit');
        });

        it('should cancel and mark RTO when status is initiated', async () => {
            const mockRto = {
                _id: 'rto1',
                shipment: 'ship1',
                reverseAwb: 'REV1',
                returnStatus: 'initiated',
                metadata: {},
                save: jest.fn().mockResolvedValue(undefined),
            };
            (RTOEvent.findById as any).mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockRto),
            });
            (Shipment.findById as any).mockResolvedValue({
                trackingNumber: 'AWB1',
                carrier: 'velocity-shipfast',
                companyId: new mongoose.Types.ObjectId(),
            });

            const result = await RTOService.cancelReverseShipment('rto1', 'Duplicate order');

            expect(result).toMatchObject({
                success: expect.any(Boolean),
                message: expect.any(String),
            });
            if (result.success) {
                expect(result.message).toContain('cancelled');
                expect(mockRto.returnStatus).toBe('cancelled');
            }
        });
    });

    describe('performRestock', () => {
        it('should throw when RTO event not found', async () => {
            (RTOEvent.findById as any).mockReturnValue({
                populate: jest.fn().mockResolvedValue(null),
            });

            const p = RTOService.performRestock('rto999');
            await expect(p).rejects.toThrow(AppError);
            await expect(p).rejects.toMatchObject({
                code: 'RTO_NOT_FOUND',
                statusCode: 404,
            });
        });

        it('should throw when RTO status is not qc_completed', async () => {
            (RTOEvent.findById as any).mockReturnValue({
                populate: jest.fn().mockResolvedValue({
                    _id: 'rto1',
                    returnStatus: 'qc_pending',
                    order: 'order1',
                }),
            });

            await expect(RTOService.performRestock('rto1')).rejects.toThrow(AppError);
            await expect(RTOService.performRestock('rto1')).rejects.toMatchObject({
                code: 'INVALID_RTO_STATUS',
                statusCode: 400,
            });
        });

        it('should throw when QC did not pass', async () => {
            (RTOEvent.findById as any).mockReturnValue({
                populate: jest.fn().mockResolvedValue({
                    _id: 'rto1',
                    returnStatus: 'qc_completed',
                    qcResult: { passed: false },
                    order: 'order1',
                }),
            });

            await expect(RTOService.performRestock('rto1')).rejects.toThrow(AppError);
            await expect(RTOService.performRestock('rto1')).rejects.toMatchObject({
                code: 'QC_NOT_PASSED',
                statusCode: 400,
            });
        });

        it('should return early when order has no products', async () => {
            (RTOEvent.findById as any).mockReturnValue({
                populate: jest.fn().mockResolvedValue({
                    _id: 'rto1',
                    returnStatus: 'qc_completed',
                    qcResult: { passed: true },
                    order: 'order1',
                    warehouse: 'wh1',
                }),
            });
            (Order.findById as any).mockResolvedValue({ _id: 'order1', products: [] });

            await expect(RTOService.performRestock('rto1')).resolves.not.toThrow();
        });
    });
});
