/**
 * Commission Analytics Service
 * 
 * Provides analytics and reporting for commission system:
 * - Performance metrics by sales rep
 * - Commission trends over time
 * - Top performers
 * - Revenue analysis
 */

import mongoose from 'mongoose';
import { CommissionTransaction } from '../../../../infrastructure/database/mongoose/models';
import { Payout } from '../../../../infrastructure/database/mongoose/models';
import { SalesRepresentative } from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';
import CacheService from '../../../../infrastructure/utilities/cache.service';

export interface CommissionMetrics {
    totalCommission: number;
    totalPaid: number;
    pending: number;
    approved: number;
    transactionCount: number;
    averageCommission: number;
}

export interface SalesRepPerformance {
    salesRepId: string;
    employeeId: string;
    name: string;
    totalCommission: number;
    totalOrders: number;
    averageCommission: number;
    conversionRate?: number;
}

export interface CommissionTrend {
    date: string;
    totalCommission: number;
    transactionCount: number;
    paidAmount: number;
}

export default class CommissionAnalyticsService {
    /**
     * Get overall commission metrics for a company
     */
    static async getCommissionMetrics(
        companyId: string,
        dateRange?: { start: Date; end: Date }
    ): Promise<CommissionMetrics> {
        const match: any = {
            company: new mongoose.Types.ObjectId(companyId),
        };

        if (dateRange) {
            match.calculatedAt = {
                $gte: dateRange.start,
                $lte: dateRange.end,
            };
        }

        const metrics = await CommissionTransaction.aggregate([
            { $match: match },
            {
                $facet: {
                    overall: [
                        {
                            $group: {
                                _id: null,
                                totalCommission: { $sum: '$finalAmount' },
                                transactionCount: { $sum: 1 },
                                averageCommission: { $avg: '$finalAmount' },
                            },
                        },
                    ],
                    byStatus: [
                        {
                            $group: {
                                _id: '$status',
                                amount: { $sum: '$finalAmount' },
                            },
                        },
                    ],
                },
            },
        ]);

        const overall = metrics[0]?.overall[0] || {
            totalCommission: 0,
            transactionCount: 0,
            averageCommission: 0,
        };

        const byStatus: Record<string, number> = {};
        (metrics[0]?.byStatus || []).forEach((item: any) => {
            byStatus[item._id] = item.amount;
        });

        return {
            totalCommission: overall.totalCommission || 0,
            totalPaid: byStatus.paid || 0,
            pending: byStatus.pending || 0,
            approved: byStatus.approved || 0,
            transactionCount: overall.transactionCount || 0,
            averageCommission: overall.averageCommission || 0,
        };
    }

    /**
     * Get top performing sales representatives
     */
    static async getTopPerformers(
        companyId: string,
        limit: number = 10,
        dateRange?: { start: Date; end: Date }
    ): Promise<SalesRepPerformance[]> {
        const match: any = {
            company: new mongoose.Types.ObjectId(companyId),
            status: { $in: ['approved', 'paid'] },
        };

        if (dateRange) {
            match.calculatedAt = {
                $gte: dateRange.start,
                $lte: dateRange.end,
            };
        }

        const performers = await CommissionTransaction.aggregate([
            { $match: match },
            {
                $group: {
                    _id: '$salesRepresentative',
                    totalCommission: { $sum: '$finalAmount' },
                    totalOrders: { $sum: 1 },
                    averageCommission: { $avg: '$finalAmount' },
                },
            },
            { $sort: { totalCommission: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'salesrepresentatives',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'salesRep',
                },
            },
            { $unwind: '$salesRep' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'salesRep.user',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: '$user' },
            {
                $project: {
                    salesRepId: { $toString: '$_id' },
                    employeeId: '$salesRep.employeeId',
                    name: '$user.name',
                    totalCommission: 1,
                    totalOrders: 1,
                    averageCommission: 1,
                },
            },
        ]);

        return performers;
    }

    /**
     * Get commission trend over time
     */
    static async getCommissionTrend(
        companyId: string,
        groupBy: 'day' | 'week' | 'month' = 'day',
        dateRange: { start: Date; end: Date }
    ): Promise<CommissionTrend[]> {
        let dateFormat = '%Y-%m-%d'; // day
        if (groupBy === 'week') {
            dateFormat = '%Y-W%U'; // year-week
        } else if (groupBy === 'month') {
            dateFormat = '%Y-%m'; // year-month
        }

        const trend = await CommissionTransaction.aggregate([
            {
                $match: {
                    company: new mongoose.Types.ObjectId(companyId),
                    calculatedAt: {
                        $gte: dateRange.start,
                        $lte: dateRange.end,
                    },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: dateFormat, date: '$calculatedAt' },
                    },
                    totalCommission: { $sum: '$finalAmount' },
                    transactionCount: { $sum: 1 },
                    paidAmount: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'paid'] }, '$finalAmount', 0],
                        },
                    },
                },
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    _id: 0,
                    date: '$_id',
                    totalCommission: 1,
                    transactionCount: 1,
                    paidAmount: 1,
                },
            },
        ]);

        return trend;
    }

    /**
     * Get sales rep dashboard metrics
     */
    static async getSalesRepDashboard(
        salesRepId: string,
        companyId: string,
        dateRange?: { start: Date; end: Date }
    ): Promise<{
        metrics: CommissionMetrics;
        recentTransactions: any[];
        payouts: any[];
    }> {
        const match: any = {
            salesRepresentative: new mongoose.Types.ObjectId(salesRepId),
            company: new mongoose.Types.ObjectId(companyId),
        };

        if (dateRange) {
            match.calculatedAt = {
                $gte: dateRange.start,
                $lte: dateRange.end,
            };
        }

        // Get metrics
        const [metricsData, recentTransactions, payouts] = await Promise.all([
            CommissionTransaction.aggregate([
                { $match: match },
                {
                    $facet: {
                        overall: [
                            {
                                $group: {
                                    _id: null,
                                    totalCommission: { $sum: '$finalAmount' },
                                    transactionCount: { $sum: 1 },
                                    averageCommission: { $avg: '$finalAmount' },
                                },
                            },
                        ],
                        byStatus: [
                            {
                                $group: {
                                    _id: '$status',
                                    amount: { $sum: '$finalAmount' },
                                },
                            },
                        ],
                    },
                },
            ]),
            CommissionTransaction.find(match)
                .populate('order', 'orderNumber totals')
                .sort({ calculatedAt: -1 })
                .limit(10)
                .lean(),
            Payout.find({
                salesRepresentative: new mongoose.Types.ObjectId(salesRepId),
                company: new mongoose.Types.ObjectId(companyId),
            })
                .sort({ payoutDate: -1 })
                .limit(5)
                .lean(),
        ]);

        const overall = metricsData[0]?.overall[0] || {
            totalCommission: 0,
            transactionCount: 0,
            averageCommission: 0,
        };

        const byStatus: Record<string, number> = {};
        (metricsData[0]?.byStatus || []).forEach((item: any) => {
            byStatus[item._id] = item.amount;
        });

        const metrics: CommissionMetrics = {
            totalCommission: overall.totalCommission || 0,
            totalPaid: byStatus.paid || 0,
            pending: byStatus.pending || 0,
            approved: byStatus.approved || 0,
            transactionCount: overall.transactionCount || 0,
            averageCommission: overall.averageCommission || 0,
        };

        return {
            metrics,
            recentTransactions,
            payouts,
        };
    }

    /**
     * Get payout statistics
     */
    static async getPayoutStats(
        companyId: string,
        dateRange?: { start: Date; end: Date }
    ): Promise<{
        totalPaid: number;
        payoutCount: number;
        averagePayout: number;
        byStatus: Record<string, number>;
    }> {
        const match: any = {
            company: new mongoose.Types.ObjectId(companyId),
        };

        if (dateRange) {
            match.payoutDate = {
                $gte: dateRange.start,
                $lte: dateRange.end,
            };
        }

        const stats = await Payout.aggregate([
            { $match: match },
            {
                $facet: {
                    overall: [
                        {
                            $group: {
                                _id: null,
                                totalPaid: { $sum: '$netAmount' },
                                payoutCount: { $sum: 1 },
                                averagePayout: { $avg: '$netAmount' },
                            },
                        },
                    ],
                    byStatus: [
                        {
                            $group: {
                                _id: '$status',
                                count: { $sum: 1 },
                            },
                        },
                    ],
                },
            },
        ]);

        const overall = stats[0]?.overall[0] || {
            totalPaid: 0,
            payoutCount: 0,
            averagePayout: 0,
        };

        const byStatus: Record<string, number> = {};
        (stats[0]?.byStatus || []).forEach((item: any) => {
            byStatus[item._id] = item.count;
        });

        return {
            totalPaid: overall.totalPaid || 0,
            payoutCount: overall.payoutCount || 0,
            averagePayout: overall.averagePayout || 0,
            byStatus,
        };
    }

    /**
     * Generate commission report CSV
     */
    static async generateReport(
        companyId: string,
        dateRange: { start: Date; end: Date },
        format: 'csv' | 'json' = 'csv'
    ): Promise<string | any[]> {
        const transactions = await CommissionTransaction.find({
            company: new mongoose.Types.ObjectId(companyId),
            calculatedAt: {
                $gte: dateRange.start,
                $lte: dateRange.end,
            },
        })
            .populate('salesRepresentative', 'employeeId')
            .populate('order', 'orderNumber')
            .populate('commissionRule', 'name ruleType')
            .sort({ calculatedAt: -1 })
            .lean();

        const data = transactions.map((t: any) => ({
            transactionId: t._id.toString(),
            date: t.calculatedAt.toISOString().split('T')[0],
            salesRepId: t.salesRepresentative?.employeeId || 'N/A',
            orderNumber: t.order?.orderNumber || 'N/A',
            ruleName: t.commissionRule?.name || 'N/A',
            ruleType: t.commissionRule?.ruleType || 'N/A',
            calculatedAmount: t.calculatedAmount.toFixed(2),
            adjustments: t.adjustments?.length || 0,
            finalAmount: t.finalAmount.toFixed(2),
            status: t.status,
        }));

        if (format === 'json') {
            return data;
        }

        // CSV format
        const headers = [
            'Transaction ID',
            'Date',
            'Sales Rep',
            'Order',
            'Rule',
            'Type',
            'Calculated',
            'Adjustments',
            'Final Amount',
            'Status',
        ];

        const rows = data.map(d =>
            [
                d.transactionId,
                d.date,
                d.salesRepId,
                d.orderNumber,
                d.ruleName,
                d.ruleType,
                d.calculatedAmount,
                d.adjustments,
                d.finalAmount,
                d.status,
            ].join(',')
        );

        return [headers.join(','), ...rows].join('\n');
    }
}
