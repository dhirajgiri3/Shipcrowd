/**
 * Revenue Analytics
 * 
 * Purpose: Revenue Analytics Service
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

import { Order, Shipment } from '../../../../infrastructure/database/mongoose/models';
import { WalletTransaction } from '../../../../infrastructure/database/mongoose/models';
import WalletService from '../wallet/wallet.service';
import AnalyticsService, { DateRange } from './analytics.service';
import logger from '../../../../shared/logger/winston.logger';
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
     *
     * NOTE: Always uses the ACTUAL current balance from WalletService.getBalance(),
     * not the lastBalance from filtered transactions (which would be incorrect if dateRange is provided).
     */
    static async getWalletStats(companyId: string, dateRange?: DateRange): Promise<WalletStats> {
        try {
            const companyObjectId = new mongoose.Types.ObjectId(companyId);
            const dateFilter = dateRange ? {
                createdAt: { $gte: dateRange.start, $lte: dateRange.end }
            } : {};

            // Get actual current balance from WalletService (not from filtered transactions)
            const balanceResult = await WalletService.getBalance(companyId);

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
                        transactionCount: { $sum: 1 }
                    }
                }
            ]);

            if (!stats) {
                return {
                    currentBalance: balanceResult.balance,
                    totalCredits: 0,
                    totalDebits: 0,
                    transactionCount: 0
                };
            }

            return {
                currentBalance: balanceResult.balance,  // Always use actual balance from Company wallet
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

    /**
     * Get Real Profitability Analytics
     * Phase 4: Powers ProfitabilityCard component
     * 
     * Calculates ACTUAL profit from Order data, not estimated margins:
     * Profit = Revenue - (Shipping + COD fees + Platform fees + Taxes + RTO costs)
     */
    static async getProfitabilityAnalytics(companyId: string, dateRange?: DateRange): Promise<{
        summary: {
            totalRevenue: number;
            totalCosts: number;
            netProfit: number;
            profitMargin: number;
        };
        breakdown: {
            shippingCosts: number;
            codCharges: number;
            platformFees: number;
            gst: number;
            rtoCosts: number;
            otherCosts?: number;
        };
        averagePerOrder: {
            revenue: number;
            profit: number;
            margin: number;
        };
        comparison?: {
            previousPeriod: {
                margin: number;
                change: number;
            };
        };
    }> {
        try {
            const now = new Date();
            const currentStart = dateRange?.start || new Date(now.getFullYear(), now.getMonth(), 1);
            const currentEnd = dateRange?.end || now;
            const periodMs = Math.max(24 * 60 * 60 * 1000, currentEnd.getTime() - currentStart.getTime());
            const previousEnd = new Date(currentStart.getTime() - 1);
            const previousStart = new Date(previousEnd.getTime() - periodMs);

            // Revenue comes from orders
            const [currentRevenueStats] = await Order.aggregate([
                {
                    $match: {
                        companyId: new mongoose.Types.ObjectId(companyId),
                        createdAt: { $gte: currentStart, $lte: currentEnd },
                        isDeleted: false
                    }
                },
                {
                    $project: {
                        revenue: '$totals.total',
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$revenue' },
                        orderCount: { $sum: 1 }
                    }
                }
            ]);

            // Costs come from shipment-level financial fields
            const [currentCostStats] = await Shipment.aggregate([
                {
                    $match: {
                        companyId: new mongoose.Types.ObjectId(companyId),
                        createdAt: { $gte: currentStart, $lte: currentEnd },
                        isDeleted: false
                    }
                },
                {
                    $project: {
                        shippingCost: {
                            $ifNull: ['$paymentDetails.shippingCost', 0],
                        },
                        codCharge: {
                            $ifNull: ['$paymentDetails.codCharges', 0],
                        },
                        platformFee: {
                            $ifNull: ['$carrierDetails.charges.platformFee', 0],
                        },
                        // Shipping-side GST (not product GST from order totals)
                        gst: { $ifNull: ['$pricingDetails.gstAmount', 0] },
                        rtoCost: {
                            $ifNull: [
                                '$rtoDetails.rtoShippingCost',
                                { $ifNull: ['$carrierDetails.charges.rtoCharges', 0] },
                            ],
                        }
                    }
                },
                {
                    $project: {
                        shippingCost: 1,
                        codCharge: 1,
                        platformFee: 1,
                        gst: 1,
                        rtoCost: 1,
                        totalCosts: {
                            $add: ['$shippingCost', '$codCharge', '$platformFee', '$gst', '$rtoCost']
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        shippingCosts: { $sum: '$shippingCost' },
                        codCharges: { $sum: '$codCharge' },
                        platformFees: { $sum: '$platformFee' },
                        gst: { $sum: '$gst' },
                        rtoCosts: { $sum: '$rtoCost' },
                        totalCosts: { $sum: '$totalCosts' }
                    }
                }
            ]);

            // Previous period revenue + cost stats for comparison
            const [previousRevenueStats, previousCostStats] = await Promise.all([
                Order.aggregate([
                    {
                        $match: {
                            companyId: new mongoose.Types.ObjectId(companyId),
                            createdAt: { $gte: previousStart, $lte: previousEnd },
                            isDeleted: false
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalRevenue: { $sum: '$totals.total' }
                        }
                    }
                ]).then(rows => rows[0]),
                Shipment.aggregate([
                    {
                        $match: {
                            companyId: new mongoose.Types.ObjectId(companyId),
                            createdAt: { $gte: previousStart, $lte: previousEnd },
                            isDeleted: false
                        }
                    },
                    {
                        $project: {
                            shippingCost: { $ifNull: ['$paymentDetails.shippingCost', 0] },
                            codCharge: { $ifNull: ['$paymentDetails.codCharges', 0] },
                            platformFee: { $ifNull: ['$carrierDetails.charges.platformFee', 0] },
                            gst: { $ifNull: ['$pricingDetails.gstAmount', 0] },
                            rtoCost: {
                                $ifNull: [
                                    '$rtoDetails.rtoShippingCost',
                                    { $ifNull: ['$carrierDetails.charges.rtoCharges', 0] },
                                ],
                            },
                        }
                    },
                    {
                        $project: {
                            totalCosts: {
                                $add: ['$shippingCost', '$codCharge', '$platformFee', '$gst', '$rtoCost']
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalCosts: { $sum: '$totalCosts' }
                        }
                    }
                ]).then(rows => rows[0]),
            ]);

            // Calculate current period metrics
            const totalRevenue = currentRevenueStats?.totalRevenue || 0;
            const totalCosts = currentCostStats?.totalCosts || 0;
            const netProfit = totalRevenue - totalCosts;
            const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
            const orderCount = currentRevenueStats?.orderCount || 0;

            // Calculate previous period margin for comparison
            const prevRevenue = previousRevenueStats?.totalRevenue || 0;
            const prevCosts = previousCostStats?.totalCosts || 0;
            const prevProfit = prevRevenue - prevCosts;
            const prevMargin = prevRevenue > 0 ? (prevProfit / prevRevenue) * 100 : 0;
            const marginChange = prevMargin > 0 ? profitMargin - prevMargin : 0;

            return {
                summary: {
                    totalRevenue: Math.round(totalRevenue * 100) / 100,
                    totalCosts: Math.round(totalCosts * 100) / 100,
                    netProfit: Math.round(netProfit * 100) / 100,
                    profitMargin: Math.round(profitMargin * 10) / 10
                },
                breakdown: {
                    shippingCosts: Math.round((currentCostStats?.shippingCosts || 0) * 100) / 100,
                    codCharges: Math.round((currentCostStats?.codCharges || 0) * 100) / 100,
                    platformFees: Math.round((currentCostStats?.platformFees || 0) * 100) / 100,
                    gst: Math.round((currentCostStats?.gst || 0) * 100) / 100,
                    rtoCosts: Math.round((currentCostStats?.rtoCosts || 0) * 100) / 100
                },
                averagePerOrder: {
                    revenue: orderCount > 0 ? Math.round((totalRevenue / orderCount) * 100) / 100 : 0,
                    profit: orderCount > 0 ? Math.round((netProfit / orderCount) * 100) / 100 : 0,
                    margin: Math.round(profitMargin * 10) / 10
                },
                comparison: {
                    previousPeriod: {
                        margin: Math.round(prevMargin * 10) / 10,
                        change: Math.round(marginChange * 10) / 10
                    }
                }
            };
        } catch (error) {
            logger.error('Error getting profitability analytics:', error);
            throw error;
        }
    }
}
