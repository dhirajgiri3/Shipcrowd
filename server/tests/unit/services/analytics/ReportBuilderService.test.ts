/**
 * ReportBuilderService Unit Tests
 */

import ReportBuilderService from '../../../../src/core/application/services/analytics/report-builder.service';

// Mock all analytics services
jest.mock('../../../../src/core/application/services/analytics/order-analytics.service', () => ({
    default: {
        getOrderStats: jest.fn().mockResolvedValue({ totalOrders: 100 }),
        getOrderTrends: jest.fn().mockResolvedValue([]),
        getOrdersByStatus: jest.fn().mockResolvedValue({}),
        getTopProducts: jest.fn().mockResolvedValue([])
    }
}));

jest.mock('../../../../src/core/application/services/analytics/shipment-analytics.service', () => ({
    default: {
        getShipmentStats: jest.fn().mockResolvedValue({ total: 50 }),
        getCourierPerformance: jest.fn().mockResolvedValue([]),
        getDeliveryTimeAnalysis: jest.fn().mockResolvedValue({})
    }
}));

jest.mock('../../../../src/core/application/services/analytics/revenue-analytics.service', () => ({
    default: {
        getRevenueStats: jest.fn().mockResolvedValue({ totalRevenue: 10000 }),
        getWalletStats: jest.fn().mockResolvedValue({}),
        getCODRemittanceStats: jest.fn().mockResolvedValue({})
    }
}));

jest.mock('../../../../src/core/application/services/analytics/customer-analytics.service', () => ({
    default: {
        getCustomerStats: jest.fn().mockResolvedValue({ totalCustomers: 25 }),
        getTopCustomers: jest.fn().mockResolvedValue([]),
        getRepeatPurchaseRate: jest.fn().mockResolvedValue({})
    }
}));

jest.mock('../../../../src/core/application/services/analytics/inventory-analytics.service', () => ({
    default: {
        getStockLevels: jest.fn().mockResolvedValue({ totalSKUs: 100 }),
        getSlowMovingProducts: jest.fn().mockResolvedValue([])
    }
}));

jest.mock('../../../../src/infrastructure/database/mongoose/models/system/reporting/report-config.model', () => {
    const mockSave = jest.fn().mockResolvedValue(true);
    const mockModel = jest.fn().mockImplementation((data) => ({
        ...data,
        save: mockSave
    }));
    (mockModel as any).findOne = jest.fn();
    (mockModel as any).find = jest.fn();
    (mockModel as any).countDocuments = jest.fn();
    (mockModel as any).deleteOne = jest.fn();
    return { default: mockModel };
});

jest.mock('../../../../src/shared/logger/winston.logger', () => ({
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
}));

describe('ReportBuilderService', () => {
    const mockCompanyId = '507f1f77bcf86cd799439011';
    const mockUserId = '507f1f77bcf86cd799439012';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('buildCustomReport', () => {
        it('should build an order report', async () => {
            const result = await ReportBuilderService.buildCustomReport(
                mockCompanyId,
                'order',
                {},
                ['stats']
            );

            expect(result.reportType).toBe('order');
            expect(result.generatedAt).toBeInstanceOf(Date);
            expect(result.data.stats).toBeDefined();
        });

        it('should build a shipment report', async () => {
            const result = await ReportBuilderService.buildCustomReport(
                mockCompanyId,
                'shipment',
                {},
                ['stats']
            );

            expect(result.reportType).toBe('shipment');
            expect(result.data.stats).toBeDefined();
        });

        it('should build a revenue report', async () => {
            const result = await ReportBuilderService.buildCustomReport(
                mockCompanyId,
                'revenue',
                {},
                ['stats']
            );

            expect(result.reportType).toBe('revenue');
            expect(result.data.stats).toBeDefined();
        });

        it('should build a customer report', async () => {
            const result = await ReportBuilderService.buildCustomReport(
                mockCompanyId,
                'customer',
                {},
                ['stats']
            );

            expect(result.reportType).toBe('customer');
            expect(result.data.stats).toBeDefined();
        });

        it('should build an inventory report', async () => {
            const result = await ReportBuilderService.buildCustomReport(
                mockCompanyId,
                'inventory',
                {},
                ['stats']
            );

            expect(result.reportType).toBe('inventory');
            expect(result.data.stockLevels).toBeDefined();
        });

        it('should apply date range filters', async () => {
            const filters = {
                dateRange: {
                    start: new Date('2024-01-01'),
                    end: new Date('2024-01-31')
                }
            };

            const result = await ReportBuilderService.buildCustomReport(
                mockCompanyId,
                'order',
                filters,
                ['stats']
            );

            expect(result.filters).toEqual(filters);
        });
    });

    describe('saveReportConfig', () => {
        it('should save a report configuration', async () => {
            const input = {
                name: 'Monthly Orders',
                reportType: 'order' as const,
                filters: {},
                metrics: ['totalOrders', 'revenue']
            };

            const result = await ReportBuilderService.saveReportConfig(
                input,
                mockUserId,
                mockCompanyId
            );

            expect(result.name).toBe('Monthly Orders');
        });
    });
});
