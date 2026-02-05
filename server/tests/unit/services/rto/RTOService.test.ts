/**
 * RTOService Unit Tests
 *
 * Aligns with existing patterns: Jest mocks for models and external services.
 * Covers triggerRTO (with full dependency mocks), getRTOStats, getRTOAnalytics,
 * updateRTOStatus, recordQCResult, and eligibility/charge behaviour.
 */

import RTOService from '../../../../src/core/application/services/rto/rto.service';
import mongoose from 'mongoose';

// ---------------------------------------------------------------------------
// Mocks (aligned with tests/unit/services/ndr/NDRResolutionService.test.ts)
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
            findOne: jest.fn().mockResolvedValue(null),
            findByIdAndUpdate: jest.fn().mockResolvedValue({}),
        },
        Shipment: {
            findById: jest.fn(),
            findOneAndUpdate: jest.fn(),
            countDocuments: jest.fn().mockResolvedValue(100),
            aggregate: jest.fn().mockResolvedValue([]),
        },
        Order: {
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
        notifyRTOInitiated: jest.fn().mockResolvedValue(undefined),
        notifyRTOQCCompleted: jest.fn().mockResolvedValue(undefined),
        notifyRTODeliveredToWarehouse: jest.fn().mockResolvedValue(undefined),
    },
}));

jest.mock('../../../../src/infrastructure/utilities/rate-limiter', () => ({
    getRateLimiter: jest.fn().mockReturnValue({
        checkLimit: jest.fn().mockResolvedValue({ allowed: true }),
    }),
}));

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

// CourierFactory is dynamically imported in RTOService; mock the module
jest.mock('../../../../src/core/application/services/courier/courier.factory', () => ({
    CourierFactory: {
        getProvider: jest.fn().mockResolvedValue({
            createReverseShipment: jest.fn().mockResolvedValue({ trackingNumber: 'REV123' }),
        }),
    },
}));

const { RTOEvent, Shipment, NDREvent } = require('../../../../src/infrastructure/database/mongoose/models');

describe('RTOService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (mongoose.startSession as jest.Mock) = jest.fn().mockResolvedValue(mockSession);
        (Shipment.findById as jest.Mock).mockImplementation((id: string) => {
            if (id === 'shipment125') {
                return Promise.resolve({ ...mockShipmentForFindById, _id: id, status: 'delivered', currentStatus: 'delivered' });
            }
            return Promise.resolve(mockShipmentForFindById);
        });
        (RTOEvent.create as jest.Mock).mockResolvedValue([{ ...mockRTOEventDoc, save: jest.fn().mockResolvedValue(undefined) }]);
        (NDREvent.findOne as jest.Mock).mockResolvedValue(null);
        (NDREvent.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
    });

    describe('triggerRTO', () => {
        it('should create RTO event with correct fields and return success', async () => {
            const result = await RTOService.triggerRTO(
                'shipment123',
                'ndr_unresolved',
                undefined,
                'manual'
            );

            expect(result.success).toBe(true);
            expect(result.rtoEventId).toBe('rto123');
            expect(result.reverseAwb).toBe('REV123');
            expect(RTOEvent.create).toHaveBeenCalled();
            expect(mockSession.commitTransaction).toHaveBeenCalled();
        });

        it('should notify warehouse of incoming return', async () => {
            const WarehouseNotificationService = require('../../../../src/core/application/services/warehouse/warehouse-notification.service').default;
            await RTOService.triggerRTO(
                'shipment123',
                'customer_cancellation',
                undefined,
                'manual'
            );
            expect(WarehouseNotificationService.notifyRTOIncoming).toHaveBeenCalled();
        });

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
            (Shipment.findById as jest.Mock).mockResolvedValueOnce(null);

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
    });

    describe('getRTOStats', () => {
        it('should return RTO statistics for company', async () => {
            (RTOEvent.aggregate as jest.Mock)
                .mockResolvedValueOnce([{ _id: null, total: 2, avgCharges: 62.5 }])
                .mockResolvedValueOnce([
                    { _id: 'ndr_unresolved', count: 1 },
                    { _id: 'customer_cancellation', count: 1 },
                ]);

            const stats = await RTOService.getRTOStats('company123');

            expect(stats.total).toBe(2);
            expect(stats.byReason).toBeDefined();
            expect(stats.byReason!['ndr_unresolved']).toBe(1);
            expect(stats.byReason!['customer_cancellation']).toBe(1);
            expect(stats.avgCharges).toBe(62.5);
            expect(stats.returnRate).toBe(0);
        });

        it('should accept optional date range', async () => {
            (RTOEvent.aggregate as jest.Mock)
                .mockResolvedValueOnce([{ _id: null, total: 1, avgCharges: 50 }])
                .mockResolvedValueOnce([{ _id: 'ndr_unresolved', count: 1 }]);

            const start = new Date('2025-01-01');
            const end = new Date('2025-01-31');
            await RTOService.getRTOStats('company123', { start, end });

            expect(RTOEvent.aggregate).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        $match: expect.objectContaining({
                            company: 'company123',
                            triggeredAt: { $gte: start, $lte: end },
                        }),
                    }),
                ])
            );
        });
    });

    describe('getRTOAnalytics', () => {
        it('should return analytics summary, trend, byCourier, byReason and recommendations', async () => {
            (RTOEvent.aggregate as jest.Mock)
                .mockResolvedValueOnce([{ avgCharge: 80 }])
                .mockResolvedValueOnce([]);

            const analytics = await RTOService.getRTOAnalytics('company123');

            expect(analytics.summary).toBeDefined();
            expect(typeof analytics.summary.totalRTO).toBe('number');
            expect(typeof analytics.summary.estimatedLoss).toBe('number');
            expect(analytics.trend).toBeDefined();
            expect(Array.isArray(analytics.trend)).toBe(true);
            expect(analytics.byCourier).toBeDefined();
            expect(analytics.byReason).toBeDefined();
            expect(analytics.recommendations).toBeDefined();
        });
    });

    describe('updateRTOStatus', () => {
        it('should update RTO status and call updateReturnStatus', async () => {
            const mockRtoDoc = {
                _id: 'rto1',
                returnStatus: 'qc_pending',
                updateReturnStatus: jest.fn().mockResolvedValue(undefined),
            };
            (RTOEvent.findById as jest.Mock).mockResolvedValue(mockRtoDoc);

            await RTOService.updateRTOStatus('rto1', 'qc_completed');

            expect(mockRtoDoc.updateReturnStatus).toHaveBeenCalledWith('qc_completed', undefined);
        });

        it('should throw when RTO event not found', async () => {
            (RTOEvent.findById as jest.Mock).mockResolvedValue(null);

            await expect(RTOService.updateRTOStatus('rto999', 'qc_completed')).rejects.toThrow(
                'RTO event not found'
            );
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
            (RTOEvent.findById as jest.Mock).mockResolvedValue(mockRtoDoc);

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
            (RTOEvent.findById as jest.Mock).mockResolvedValue({
                _id: 'rto1',
                returnStatus: 'initiated',
                recordQC: jest.fn(),
            });

            await expect(
                RTOService.recordQCResult('rto1', { passed: true, inspectedBy: 'tester' })
            ).rejects.toThrow('RTO must be delivered to warehouse before QC');
        });
    });
});
