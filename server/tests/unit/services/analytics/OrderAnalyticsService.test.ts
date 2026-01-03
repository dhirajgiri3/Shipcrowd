/**
 * OrderAnalyticsService Unit Tests
 */

import OrderAnalyticsService from '../../../../src/core/application/services/analytics/order-analytics.service';

// Mock dependencies
jest.mock('../../../../src/infrastructure/database/mongoose/models/order.model', () => ({
    aggregate: jest.fn()
}));

jest.mock('../../../../src/shared/logger/winston.logger', () => ({
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
}));

import Order from '../../../../src/infrastructure/database/mongoose/models/order.model';

describe('OrderAnalyticsService', () => {
    const mockCompanyId = '507f1f77bcf86cd799439011';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getOrderStats', () => {
        it('should return order statistics for a company', async () => {
            const mockStats = {
                totalOrders: 100,
                totalRevenue: 50000,
                codOrders: 60,
                prepaidOrders: 40,
                codRevenue: 30000,
                prepaidRevenue: 20000
            };

            (Order.aggregate as jest.Mock).mockResolvedValue([mockStats]);

            const result = await OrderAnalyticsService.getOrderStats(mockCompanyId);

            expect(result.totalOrders).toBe(100);
            expect(result.totalRevenue).toBe(50000);
            expect(result.averageOrderValue).toBe(500);
            expect(result.codOrders).toBe(60);
            expect(result.prepaidOrders).toBe(40);
        });

        it('should return zeros when no orders exist', async () => {
            (Order.aggregate as jest.Mock).mockResolvedValue([]);

            const result = await OrderAnalyticsService.getOrderStats(mockCompanyId);

            expect(result.totalOrders).toBe(0);
            expect(result.totalRevenue).toBe(0);
            expect(result.averageOrderValue).toBe(0);
        });

        it('should filter by date range when provided', async () => {
            const dateRange = {
                start: new Date('2024-01-01'),
                end: new Date('2024-01-31')
            };

            (Order.aggregate as jest.Mock).mockResolvedValue([{
                totalOrders: 50,
                totalRevenue: 25000,
                codOrders: 30,
                prepaidOrders: 20,
                codRevenue: 15000,
                prepaidRevenue: 10000
            }]);

            await OrderAnalyticsService.getOrderStats(mockCompanyId, dateRange);

            expect(Order.aggregate).toHaveBeenCalled();
            const callArg = (Order.aggregate as jest.Mock).mock.calls[0][0];
            expect(callArg[0].$match.createdAt).toBeDefined();
        });
    });

    describe('getOrderTrends', () => {
        it('should return daily trends', async () => {
            const mockTrends = [
                { _id: '2024-01-01', orders: 10, revenue: 5000 },
                { _id: '2024-01-02', orders: 15, revenue: 7500 }
            ];

            (Order.aggregate as jest.Mock).mockResolvedValue(mockTrends);

            const result = await OrderAnalyticsService.getOrderTrends(
                mockCompanyId,
                { start: new Date('2024-01-01'), end: new Date('2024-01-31') },
                'day'
            );

            expect(result).toHaveLength(2);
            expect(result[0].date).toBe('2024-01-01');
            expect(result[0].orders).toBe(10);
        });
    });

    describe('getTopProducts', () => {
        it('should return top selling products', async () => {
            const mockProducts = [
                { _id: 'SKU001', name: 'Product A', quantity: 100, revenue: 10000 },
                { _id: 'SKU002', name: 'Product B', quantity: 50, revenue: 5000 }
            ];

            (Order.aggregate as jest.Mock).mockResolvedValue(mockProducts);

            const result = await OrderAnalyticsService.getTopProducts(mockCompanyId, undefined, 10);

            expect(result).toHaveLength(2);
            expect(result[0].quantity).toBe(100);
        });
    });

    describe('getOrdersByStatus', () => {
        it('should return order counts by status', async () => {
            const mockStatusCounts = [
                { _id: 'pending', count: 20 },
                { _id: 'delivered', count: 80 }
            ];

            (Order.aggregate as jest.Mock).mockResolvedValue(mockStatusCounts);

            const result = await OrderAnalyticsService.getOrdersByStatus(mockCompanyId);

            expect(result['pending']).toBe(20);
            expect(result['delivered']).toBe(80);
        });
    });
});
