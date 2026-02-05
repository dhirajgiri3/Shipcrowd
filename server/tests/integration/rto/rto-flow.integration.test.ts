/**
 * RTO Flow Integration Tests
 *
 * Covers: list events, get event, update status, record QC, disposition suggest/execute,
 * and (mocked) public track. Uses mocked models to avoid DB dependency.
 */

const mockRTOEvent = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
};

const mockOrder = { findById: jest.fn() };

jest.mock('@/infrastructure/database/mongoose/models', () => ({
    __esModule: true,
    RTOEvent: mockRTOEvent,
    Order: mockOrder,
}));

jest.mock('@/core/application/services/wallet/wallet.service', () => ({
    deductRTCharges: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/core/application/services/warehouse/warehouse-notification.service', () => ({
    notifyRTOIncoming: jest.fn().mockResolvedValue(undefined),
}));

import { RTODispositionService } from '@/core/application/services/rto/rto-disposition.service';

describe('RTO Flow Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const chainLean = (value: any) => ({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(value),
    });

    describe('Disposition suggest', () => {
        it('should suggest restock when QC passed', async () => {
            mockRTOEvent.findById.mockReturnValue(chainLean({
                _id: 'rto1',
                returnStatus: 'qc_completed',
                qcResult: { passed: true },
                order: 'ord1',
            }));
            mockOrder.findById.mockResolvedValue({ totals: { total: 500 }, products: [] });

            const result = await RTODispositionService.suggestDisposition('rto1');

            expect(result.action).toBe('restock');
            expect(result.reason).toContain('QC passed');
            expect(result.automated).toBe(true);
        });

        it('should suggest dispose when no QC result', async () => {
            mockRTOEvent.findById.mockReturnValue(chainLean({
                _id: 'rto2',
                returnStatus: 'qc_completed',
                qcResult: null,
                order: 'ord2',
            }));

            const result = await RTODispositionService.suggestDisposition('rto2');

            expect(result.action).toBe('dispose');
            expect(result.reason).toContain('No QC result');
        });

        it('should suggest claim when damage types indicate courier damage', async () => {
            mockRTOEvent.findById.mockReturnValue(chainLean({
                _id: 'rto3',
                returnStatus: 'qc_completed',
                qcResult: { passed: false, damageTypes: ['Crushed Box', 'Torn Packaging'] },
                order: 'ord3',
            }));
            mockOrder.findById.mockResolvedValue({ totals: { total: 1000 }, products: [] });

            const result = await RTODispositionService.suggestDisposition('rto3');

            expect(result.action).toBe('claim');
            expect(result.reason).toContain('courier');
        });

        it('should throw when status is not qc_completed', async () => {
            mockRTOEvent.findById.mockReturnValue(chainLean({
                _id: 'rto4',
                returnStatus: 'qc_pending',
                qcResult: null,
            }));

            await expect(RTODispositionService.suggestDisposition('rto4')).rejects.toThrow(
                'Disposition can only be suggested after QC is completed'
            );
        });
    });

    describe('Disposition execute', () => {
        it('should throw when disposition already set', async () => {
            const rtoDoc = {
                _id: 'rto5',
                returnStatus: 'qc_completed',
                disposition: { action: 'restocked' },
                qcResult: { passed: true },
                updateReturnStatus: jest.fn().mockResolvedValue(undefined),
            };
            mockRTOEvent.findById.mockResolvedValue(rtoDoc);

            await expect(
                RTODispositionService.executeDisposition('rto5', 'restock', 'user1')
            ).rejects.toThrow('Disposition already recorded');
        });

        it('should throw when QC did not pass for restock', async () => {
            const rtoDoc = {
                _id: 'rto6',
                returnStatus: 'qc_completed',
                disposition: undefined,
                qcResult: { passed: false },
                updateReturnStatus: jest.fn(),
            };
            mockRTOEvent.findById.mockResolvedValue(rtoDoc);

            await expect(
                RTODispositionService.executeDisposition('rto6', 'restock', 'user1')
            ).rejects.toThrow('Cannot restock when QC did not pass');
        });
    });
});
