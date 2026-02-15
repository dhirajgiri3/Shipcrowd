/**
 * Order Analytics
 * 
 * Purpose: Order Analytics Service
 * 
 * DEPENDENCIES:
 * - Database Models, Logger
 * 
 * TESTING:
 * Unit Tests: tests/unit/services/.../{filename}.test.ts
 * Coverage: TBD
 * 
 * NOTE: This service needs comprehensive documentation.
 * See SERVICE_TEMPLATE.md for documentation standards.
 */

import { Order } from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';
import { operationalOrderTotalExpression } from '../../../../shared/utils/order-currency.util';
import AnalyticsService, { DateRange } from './analytics.service';

export interface OrderStats {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    codOrders: number;
    prepaidOrders: number;
    codRevenue: number;
    prepaidRevenue: number;
}

export interface OrderTrend {
    date: string;
    orders: number;
    revenue: number;
}

export interface TopProduct {
    sku: string;
    name: string;
    quantity: number;
    revenue: number;
}

export default class OrderAnalyticsService {
    /**
     * Get overall order statistics
     */
    static async getOrderStats(companyId: string, dateRange?: DateRange): Promise<OrderStats> {
        try {
            const matchStage = AnalyticsService.buildMatchStage(companyId, dateRange, { isDeleted: false });

            const [stats] = await Order.aggregate([
                matchStage,
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        totalRevenue: { $sum: operationalOrderTotalExpression },
                        codOrders: {
                            $sum: { $cond: [{ $eq: ['$paymentMethod', 'cod'] }, 1, 0] }
                        },
                        prepaidOrders: {
                            $sum: { $cond: [{ $eq: ['$paymentMethod', 'prepaid'] }, 1, 0] }
                        },
                        codRevenue: {
                            $sum: { $cond: [{ $eq: ['$paymentMethod', 'cod'] }, operationalOrderTotalExpression, 0] }
                        },
                        prepaidRevenue: {
                            $sum: { $cond: [{ $eq: ['$paymentMethod', 'prepaid'] }, operationalOrderTotalExpression, 0] }
                        }
                    }
                }
            ]);

            if (!stats) {
                return {
                    totalOrders: 0,
                    totalRevenue: 0,
                    averageOrderValue: 0,
                    codOrders: 0,
                    prepaidOrders: 0,
                    codRevenue: 0,
                    prepaidRevenue: 0
                };
            }

            return {
                ...stats,
                averageOrderValue: stats.totalOrders > 0
                    ? Math.round((stats.totalRevenue / stats.totalOrders) * 100) / 100
                    : 0
            };
        } catch (error) {
            logger.error('Error getting order stats:', error);
            throw error;
        }
    }

    /**
     * Get order trends over time
     */
    static async getOrderTrends(
        companyId: string,
        dateRange: DateRange,
        groupBy: 'day' | 'week' | 'month' = 'day'
    ): Promise<OrderTrend[]> {
        try {
            const matchStage = AnalyticsService.buildMatchStage(companyId, dateRange, { isDeleted: false });
            const dateFormat = AnalyticsService.getDateFormat(groupBy);

            const results = await Order.aggregate([
                matchStage,
                {
                    $group: {
                        _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
                        orders: { $sum: 1 },
                        revenue: { $sum: operationalOrderTotalExpression }
                    }
                },
                { $sort: { _id: 1 } },
                {
                    $project: {
                        _id: 0,
                        date: '$_id',
                        orders: 1,
                        revenue: { $round: ['$revenue', 2] }
                    }
                }
            ]);

            return results;
        } catch (error) {
            logger.error('Error getting order trends:', error);
            throw error;
        }
    }

    /**
     * Get top selling products
     */
    static async getTopProducts(
        companyId: string,
        dateRange?: DateRange,
        limit = 10
    ): Promise<TopProduct[]> {
        try {
            const matchStage = AnalyticsService.buildMatchStage(companyId, dateRange, { isDeleted: false });

            const results = await Order.aggregate([
                matchStage,
                { $unwind: '$products' },
                {
                    $group: {
                        _id: '$products.sku',
                        name: { $first: '$products.name' },
                        quantity: { $sum: '$products.quantity' },
                        revenue: { $sum: { $multiply: ['$products.quantity', '$products.unitPrice'] } }
                    }
                },
                { $sort: { revenue: -1 } },
                { $limit: limit },
                {
                    $project: {
                        _id: 0,
                        sku: '$_id',
                        name: 1,
                        quantity: 1,
                        revenue: { $round: ['$revenue', 2] }
                    }
                }
            ]);

            return results;
        } catch (error) {
            logger.error('Error getting top products:', error);
            throw error;
        }
    }

    /**
     * Get order count by status
     */
    static async getOrdersByStatus(
        companyId: string,
        dateRange?: DateRange
    ): Promise<Record<string, number>> {
        try {
            const matchStage = AnalyticsService.buildMatchStage(companyId, dateRange, { isDeleted: false });

            const results = await Order.aggregate([
                matchStage,
                {
                    $group: {
                        _id: '$currentStatus',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const statusCounts: Record<string, number> = {};
            results.forEach(r => {
                statusCounts[r._id] = r.count;
            });

            return statusCounts;
        } catch (error) {
            logger.error('Error getting orders by status:', error);
            throw error;
        }
    }
}
