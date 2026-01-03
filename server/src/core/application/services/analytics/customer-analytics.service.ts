/**
 * Customer Analytics Service
 * 
 * Provides customer statistics, lifetime value, and retention metrics.
 */

import mongoose from 'mongoose';
import { Order } from '../../../../infrastructure/database/mongoose/models';
import AnalyticsService, { DateRange } from './analytics.service';
import logger from '../../../../shared/logger/winston.logger';

export interface CustomerStats {
    totalCustomers: number;
    newCustomers: number;
    repeatCustomers: number;
    repeatRate: number;
}

export interface TopCustomer {
    phone: string;
    name: string;
    orderCount: number;
    totalSpent: number;
    averageOrderValue: number;
}

export default class CustomerAnalyticsService {
    /**
     * Get customer statistics
     */
    static async getCustomerStats(companyId: string, dateRange?: DateRange): Promise<CustomerStats> {
        try {
            const matchStage = AnalyticsService.buildMatchStage(companyId, dateRange, { isDeleted: false });

            // Get unique customers and their order counts
            const results = await Order.aggregate([
                matchStage,
                {
                    $group: {
                        _id: '$customerInfo.phone',
                        orderCount: { $sum: 1 }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalCustomers: { $sum: 1 },
                        repeatCustomers: {
                            $sum: { $cond: [{ $gte: ['$orderCount', 2] }, 1, 0] }
                        }
                    }
                }
            ]);

            const stats = results[0] || { totalCustomers: 0, repeatCustomers: 0 };

            // Get new customers in date range (first order in this period)
            // OPTIMIZED: Uses index on customerInfo.phone + companyId + createdAt
            let newCustomers = 0;
            if (dateRange) {
                const newCustomerResult = await Order.aggregate([
                    // First, get ALL orders (no date filter yet) - but only fields we need
                    {
                        $match: {
                            companyId: new mongoose.Types.ObjectId(companyId),
                            isDeleted: false
                        }
                    },
                    // Sort by phone + date (uses index)
                    {
                        $sort: { 'customerInfo.phone': 1, createdAt: 1 }
                    },
                    // Group by phone and get FIRST order date
                    {
                        $group: {
                            _id: '$customerInfo.phone',
                            firstOrder: { $first: '$createdAt' }
                        }
                    },
                    // NOW filter by first order date (much smaller dataset)
                    {
                        $match: {
                            firstOrder: { $gte: dateRange.start, $lte: dateRange.end }
                        }
                    },
                    {
                        $count: 'count'
                    }
                ]);
                newCustomers = newCustomerResult[0]?.count || 0;
            }

            return {
                totalCustomers: stats.totalCustomers,
                newCustomers,
                repeatCustomers: stats.repeatCustomers,
                repeatRate: stats.totalCustomers > 0
                    ? Math.round((stats.repeatCustomers / stats.totalCustomers) * 100 * 10) / 10
                    : 0
            };
        } catch (error) {
            logger.error('Error getting customer stats:', error);
            throw error;
        }
    }

    /**
     * Get top customers by total spent
     */
    static async getTopCustomers(
        companyId: string,
        dateRange?: DateRange,
        limit = 10
    ): Promise<TopCustomer[]> {
        try {
            const matchStage = AnalyticsService.buildMatchStage(companyId, dateRange, { isDeleted: false });

            const results = await Order.aggregate([
                matchStage,
                {
                    $group: {
                        _id: '$customerInfo.phone',
                        name: { $first: '$customerInfo.name' },
                        orderCount: { $sum: 1 },
                        totalSpent: { $sum: '$totals.total' }
                    }
                },
                { $sort: { totalSpent: -1 } },
                { $limit: limit },
                {
                    $project: {
                        _id: 0,
                        phone: '$_id',
                        name: 1,
                        orderCount: 1,
                        totalSpent: { $round: ['$totalSpent', 2] },
                        averageOrderValue: {
                            $round: [{ $divide: ['$totalSpent', '$orderCount'] }, 2]
                        }
                    }
                }
            ]);

            return results;
        } catch (error) {
            logger.error('Error getting top customers:', error);
            throw error;
        }
    }

    /**
     * Get repeat purchase rate
     */
    static async getRepeatPurchaseRate(companyId: string, dateRange?: DateRange): Promise<{
        total: number;
        repeat: number;
        rate: number;
    }> {
        try {
            const matchStage = AnalyticsService.buildMatchStage(companyId, dateRange, { isDeleted: false });

            const results = await Order.aggregate([
                matchStage,
                {
                    $group: {
                        _id: '$customerInfo.phone',
                        orderCount: { $sum: 1 }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        repeat: {
                            $sum: { $cond: [{ $gte: ['$orderCount', 2] }, 1, 0] }
                        }
                    }
                }
            ]);

            const stats = results[0] || { total: 0, repeat: 0 };

            return {
                total: stats.total,
                repeat: stats.repeat,
                rate: stats.total > 0 ? Math.round((stats.repeat / stats.total) * 100 * 10) / 10 : 0
            };
        } catch (error) {
            logger.error('Error getting repeat purchase rate:', error);
            throw error;
        }
    }
}
