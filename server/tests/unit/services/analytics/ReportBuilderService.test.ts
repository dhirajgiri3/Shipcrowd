/**
 * ReportBuilderService Unit Tests
 * 
 * Uses proper Jest mocking with inline factory functions
 */

// All mocks must be defined INSIDE the jest.mock factory functions
// because Jest hoists jest.mock calls but not variable declarations

jest.mock('../../../../src/core/application/services/analytics/order-analytics.service', () => ({
    __esModule: true,
    default: {
        getOrderStats: jest.fn().mockResolvedValue({ totalOrders: 100, totalRevenue: 50000 }),
        getOrderTrends: jest.fn().mockResolvedValue([{ date: '2024-01-01', orders: 10, revenue: 5000 }]),
        getOrdersByStatus: jest.fn().mockResolvedValue({ pending: 20, delivered: 80 }),
        getTopProducts: jest.fn().mockResolvedValue([{ sku: 'SKU001', name: 'Product A', quantity: 100 }])
    }
}));

jest.mock('../../../../src/core/application/services/analytics/shipment-analytics.service', () => ({
    __esModule: true,
    default: {
        getShipmentStats: jest.fn().mockResolvedValue({ total: 50, delivered: 40, inTransit: 5 }),
        getCourierPerformance: jest.fn().mockResolvedValue([{ carrier: 'Delhivery', shipments: 30 }]),
        getDeliveryTimeAnalysis: jest.fn().mockResolvedValue({ under24h: 10, days1to3: 25 })
    }
}));

jest.mock('../../../../src/core/application/services/analytics/revenue-analytics.service', () => ({
    __esModule: true,
    default: {
        getRevenueStats: jest.fn().mockResolvedValue({ totalRevenue: 10000, codRevenue: 6000, prepaidRevenue: 4000 }),
        getWalletStats: jest.fn().mockResolvedValue({ currentBalance: 5000 }),
        getCODRemittanceStats: jest.fn().mockResolvedValue({ pendingAmount: 2000 })
    }
}));

jest.mock('../../../../src/core/application/services/analytics/customer-analytics.service', () => ({
    __esModule: true,
    default: {
        getCustomerStats: jest.fn().mockResolvedValue({ totalCustomers: 25, newCustomers: 10 }),
        getTopCustomers: jest.fn().mockResolvedValue([{ name: 'Customer A', orders: 15 }]),
        getRepeatPurchaseRate: jest.fn().mockResolvedValue({ rate: 35.5 })
    }
}));

jest.mock('../../../../src/core/application/services/analytics/inventory-analytics.service', () => ({
    __esModule: true,
    default: {
        getStockLevels: jest.fn().mockResolvedValue({ totalSKUs: 100, lowStock: 5, outOfStock: 2 }),
        getSlowMovingProducts: jest.fn().mockResolvedValue([{ sku: 'SKU099', name: 'Slow Product' }])
    }
}));

// Mock ReportConfig model
jest.mock('../../../../src/infrastructure/database/mongoose/models', () => {
    const mockSave = jest.fn().mockResolvedValue(true);
    function MockReportConfig(this: any, data: any) {
        Object.assign(this, data);
        this._id = '507f1f77bcf86cd799439013';
        this.save = mockSave;
    }
    MockReportConfig.findOne = jest.fn();
    MockReportConfig.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
    });
    MockReportConfig.countDocuments = jest.fn().mockResolvedValue(0);
    MockReportConfig.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

    return {
        ReportConfig: MockReportConfig
    };
});

jest.mock('../../../../src/shared/logger/winston.logger', () => ({
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
}));

// Import AFTER mocks
import OrderAnalyticsService from '../../../../src/core/application/services/analytics/order-analytics.service';
import ReportBuilderService from '../../../../src/core/application/services/analytics/report-builder.service';
import { ReportConfig } from '../../../../src/infrastructure/database/mongoose/models';

describe('ReportBuilderService', () => {
    const mockCompanyId = '507f1f77bcf86cd799439011';
    const mockUserId = '507f1f77bcf86cd799439012';

    beforeEach(() => {
        jest.clearAllMocks();

        // Order Analytics Mocks
        (OrderAnalyticsService.getOrderStats as jest.Mock).mockResolvedValue({ totalOrders: 100, totalRevenue: 50000 });
        (OrderAnalyticsService.getOrderTrends as jest.Mock).mockResolvedValue([{ date: '2024-01-01', orders: 10, revenue: 5000 }]);
        (OrderAnalyticsService.getOrdersByStatus as jest.Mock).mockResolvedValue({ pending: 20, delivered: 80 });
        (OrderAnalyticsService.getTopProducts as jest.Mock).mockResolvedValue([{ sku: 'SKU001', name: 'Product A', quantity: 100 }]);

        // Shipment Analytics Mocks
        jest.requireMock('../../../../src/core/application/services/analytics/shipment-analytics.service').default.getShipmentStats.mockResolvedValue({ total: 50, delivered: 40, inTransit: 5 });
        jest.requireMock('../../../../src/core/application/services/analytics/shipment-analytics.service').default.getCourierPerformance.mockResolvedValue([{ carrier: 'Delhivery', shipments: 30 }]);
        jest.requireMock('../../../../src/core/application/services/analytics/shipment-analytics.service').default.getDeliveryTimeAnalysis.mockResolvedValue({ under24h: 10, days1to3: 25 });

        // Revenue Analytics Mocks
        jest.requireMock('../../../../src/core/application/services/analytics/revenue-analytics.service').default.getRevenueStats.mockResolvedValue({ totalRevenue: 10000, codRevenue: 6000, prepaidRevenue: 4000 });
        jest.requireMock('../../../../src/core/application/services/analytics/revenue-analytics.service').default.getWalletStats.mockResolvedValue({ currentBalance: 5000 });
        jest.requireMock('../../../../src/core/application/services/analytics/revenue-analytics.service').default.getCODRemittanceStats.mockResolvedValue({ pendingAmount: 2000 });

        // Customer Analytics Mocks
        jest.requireMock('../../../../src/core/application/services/analytics/customer-analytics.service').default.getCustomerStats.mockResolvedValue({ totalCustomers: 25, newCustomers: 10 });
        jest.requireMock('../../../../src/core/application/services/analytics/customer-analytics.service').default.getTopCustomers.mockResolvedValue([{ name: 'Customer A', orders: 15 }]);
        jest.requireMock('../../../../src/core/application/services/analytics/customer-analytics.service').default.getRepeatPurchaseRate.mockResolvedValue({ rate: 35.5 });

        // Inventory Analytics Mocks
        jest.requireMock('../../../../src/core/application/services/analytics/inventory-analytics.service').default.getStockLevels.mockResolvedValue({ totalSKUs: 100, lowStock: 5, outOfStock: 2 });
        jest.requireMock('../../../../src/core/application/services/analytics/inventory-analytics.service').default.getSlowMovingProducts.mockResolvedValue([{ sku: 'SKU099', name: 'Slow Product' }]);
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
            expect(result.data.stats.totalOrders).toBe(100);
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
            expect(result.data.stats.total).toBe(50);
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
            expect(result.data.stats.totalRevenue).toBe(10000);
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
            expect(result.data.stats.totalCustomers).toBe(25);
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
            expect(result.data.stockLevels.totalSKUs).toBe(100);
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
            expect(OrderAnalyticsService.getOrderStats).toHaveBeenCalledWith(
                mockCompanyId,
                expect.objectContaining({
                    start: expect.any(Date),
                    end: expect.any(Date)
                })
            );
        });

        it('should include trends when groupBy is provided', async () => {
            const result = await ReportBuilderService.buildCustomReport(
                mockCompanyId,
                'order',
                { dateRange: { start: new Date('2024-01-01'), end: new Date('2024-01-31') } },
                ['stats'],
                'day'
            );

            expect(OrderAnalyticsService.getOrderTrends).toHaveBeenCalled();
            expect(result.data.trends).toBeDefined();
            expect(result.data.trends).toHaveLength(1);
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
            expect(result.company).toBe(mockCompanyId);
            expect(result.createdBy).toBe(mockUserId);
        });
    });

    describe('listReportConfigs', () => {
        it('should list report configurations with pagination', async () => {
            const mockConfigs = [
                { _id: '1', name: 'Report 1', reportType: 'order' },
                { _id: '2', name: 'Report 2', reportType: 'shipment' }
            ];

            (ReportConfig.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockConfigs)
            });
            (ReportConfig.countDocuments as jest.Mock).mockResolvedValue(2);

            const result = await ReportBuilderService.listReportConfigs(mockCompanyId, 1, 20);

            expect(result.configs).toHaveLength(2);
            expect(result.total).toBe(2);
            expect(result.pages).toBe(1);
        });
    });

    describe('deleteReportConfig', () => {
        it('should delete a report configuration', async () => {
            (ReportConfig.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 });

            await expect(
                ReportBuilderService.deleteReportConfig('config123', mockCompanyId)
            ).resolves.not.toThrow();

            expect(ReportConfig.deleteOne).toHaveBeenCalledWith({
                _id: 'config123',
                company: mockCompanyId
            });
        });

        it('should throw error when config not found', async () => {
            (ReportConfig.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 0 });

            await expect(
                ReportBuilderService.deleteReportConfig('nonexistent', mockCompanyId)
            ).rejects.toThrow('Report configuration not found');
        });
    });
});
