import mongoose from 'mongoose';
import RTOAnalyticsService from '../../../../src/core/application/services/rto/rto-analytics.service';

jest.mock('../../../../src/infrastructure/database/mongoose/models', () => ({
    RTOEvent: {
        countDocuments: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue([]),
    },
    Shipment: {
        countDocuments: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue([]),
    },
}));

jest.mock('../../../../src/core/application/services/courier/courier-provider-registry', () => ({
    __esModule: true,
    default: {
        toCanonical: jest.fn((provider: string) => provider),
        getLabel: jest.fn((provider: string) => provider || 'Unknown'),
    },
}));

const { RTOEvent, Shipment } = require('../../../../src/infrastructure/database/mongoose/models');

describe('RTOAnalyticsService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (RTOEvent.countDocuments as jest.Mock).mockResolvedValue(0);
        (Shipment.countDocuments as jest.Mock).mockResolvedValue(0);
        (RTOEvent.aggregate as jest.Mock).mockResolvedValue([]);
        (Shipment.aggregate as jest.Mock).mockResolvedValue([]);
    });

    it('returns canonical response with default last-30-days period', async () => {
        const companyId = new mongoose.Types.ObjectId().toString();
        const result = await RTOAnalyticsService.getAnalytics(companyId);

        expect(result.summary).toBeDefined();
        expect(result.summary.periodLabel).toBe('Last 30 Days');
        expect(result.stats).toBeDefined();
        expect(result.period.startDate).toBeDefined();
        expect(result.period.endDate).toBeDefined();
        expect(Array.isArray(result.byCourier)).toBe(true);
        expect(Array.isArray(result.byReason)).toBe(true);
        expect(Array.isArray(result.trend)).toBe(true);
    });

    it('applies warehouse and reason filters to RTO queries', async () => {
        const companyId = new mongoose.Types.ObjectId().toString();
        const warehouseId = new mongoose.Types.ObjectId().toString();

        await RTOAnalyticsService.getAnalytics(companyId, {
            startDate: '2026-01-01T00:00:00.000Z',
            endDate: '2026-01-31T23:59:59.999Z',
            warehouseId,
            rtoReason: 'ndr_unresolved',
        });

        const rtoCountArgs = (RTOEvent.countDocuments as jest.Mock).mock.calls.map((call) => call[0]);
        expect(rtoCountArgs).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rtoReason: 'ndr_unresolved',
                    warehouse: expect.any(mongoose.Types.ObjectId),
                    triggeredAt: expect.any(Object),
                }),
            ])
        );
    });
});
