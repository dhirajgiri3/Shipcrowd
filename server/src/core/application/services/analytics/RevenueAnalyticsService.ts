/**
 * Revenue Analytics Service
 * 
 * Provides revenue statistics, wallet analytics, and COD remittance tracking.
 */

import Order from '../../../../infrastructure/database/mongoose/models/Order.js';
import WalletTransaction from '../../../../infrastructure/database/mongoose/models/WalletTransaction.js';
import AnalyticsService, { DateRange } from './AnalyticsService.js';
import logger from '../../../../shared/logger/winston.logger.js';
import mongoose from 'mongoose';

export interface RevenueStats {
    totalRevenue: number;
    codRevenue: number;
    prepaidRevenue: number;
    averageOrderValue: number;
    orderCount: number;
}

export interface WalletStats {
    currentBalance: number;
    totalCredits: number;
    totalDebits: number;
    transactionCount: number;
}

export interface CODRemittanceStats {
    pendingAmount: number;
    receivedAmount: number;
    pendingCount: number;
}

export default class RevenueAnalyticsService {
    /**
     * Get revenue statistics from orders
     */
    static async getRevenueStats(companyId: string, dateRange?: DateRange): Promise<RevenueStats> {
        try {
            const matchStage = AnalyticsService.buildMatchStage(companyId, dateRange, { isDeleted: false });

            const [stats] = await Order.aggregate([
                matchStage,
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$totals.total' },
                        codRevenue: {
                            $sum: { $cond: [{ $eq: ['$paymentMethod', 'cod'] }, '$totals.total', 0] }
                        },
                        prepaidRevenue: {
                            $sum: { $cond: [{ $eq: ['$paymentMethod', 'prepaid'] }, '$totals.total', 0] }
                        },
                        orderCount: { $sum: 1 }
                    }
                }
            ]);

            if (!stats) {
                return {
                    totalRevenue: 0,
                    codRevenue: 0,
                    prepaidRevenue: 0,
                    averageOrderValue: 0,
                    orderCount: 0
                };
            }

            return {
                totalRevenue: Math.round(stats.totalRevenue * 100) / 100,
                codRevenue: Math.round(stats.codRevenue * 100) / 100,
                prepaidRevenue: Math.round(stats.prepaidRevenue * 100) / 100,
                averageOrderValue: stats.orderCount > 0
                    ? Math.round((stats.totalRevenue / stats.orderCount) * 100) / 100
                    : 0,
                orderCount: stats.orderCount
            };
        } catch (error) {
            logger.error('Error getting revenue stats:', error);
            throw error;
        }
    }

    /**
     * Get wallet statistics
     */
    static async getWalletStats(companyId: string, dateRange?: DateRange): Promise<WalletStats> {
        try {
            const companyObjectId = new mongoose.Types.ObjectId(companyId);
            const dateFilter = dateRange ? {
                createdAt: { $gte: dateRange.start, $lte: dateRange.end }
            } : {};

            const [stats] = await WalletTransaction.aggregate([
                {
                    $match: {
                        company: companyObjectId,
                        ...dateFilter
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalCredits: {
                            $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0] }
                        },
                        totalDebits: {
                            $sum: { $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0] }
                        },
                        transactionCount: { $sum: 1 },
                        lastBalance: { $last: '$balanceAfter' }
                    }
                }
            ]);

            if (!stats) {
                return {
                    currentBalance: 0,
                    totalCredits: 0,
                    totalDebits: 0,
                    transactionCount: 0
                };
            }

            return {
                currentBalance: Math.round(stats.lastBalance * 100) / 100,
                totalCredits: Math.round(stats.totalCredits * 100) / 100,
                totalDebits: Math.round(stats.totalDebits * 100) / 100,
                transactionCount: stats.transactionCount
            };
        } catch (error) {
            logger.error('Error getting wallet stats:', error);
            throw error;
        }
    }

    /**
     * Get COD remittance statistics
     */
    static async getCODRemittanceStats(companyId: string, dateRange?: DateRange): Promise<CODRemittanceStats> {
        try {
            const companyObjectId = new mongoose.Types.ObjectId(companyId);
            const dateFilter = dateRange ? {
                createdAt: { $gte: dateRange.start, $lte: dateRange.end }
            } : {};

            const [stats] = await WalletTransaction.aggregate([
                {
                    $match: {
                        company: companyObjectId,
                        reason: 'cod_remittance',
                        ...dateFilter
                    }
                },
                {
                    $group: {
                        _id: null,
                        receivedAmount: { $sum: '$amount' },
                        receivedCount: { $sum: 1 }
                    }
                }
            ]);

            // Get pending COD from orders
            const [pendingCOD] = await Order.aggregate([
                {
                    $match: {
                        companyId: companyObjectId,
                        paymentMethod: 'cod',
                        paymentStatus: 'pending',
                        currentStatus: 'delivered',
                        isDeleted: false,
                        ...dateFilter
                    }
                },
                {
                    $group: {
                        _id: null,
                        pendingAmount: { $sum: '$totals.total' },
                        pendingCount: { $sum: 1 }
                    }
                }
            ]);

            return {
                pendingAmount: Math.round((pendingCOD?.pendingAmount || 0) * 100) / 100,
                receivedAmount: Math.round((stats?.receivedAmount || 0) * 100) / 100,
                pendingCount: pendingCOD?.pendingCount || 0
            };
        } catch (error) {
            logger.error('Error getting COD remittance stats:', error);
            throw error;
        }
    }
}
