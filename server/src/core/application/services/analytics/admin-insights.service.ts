/**
 * Admin Insights Service
 * Platform-level, data-driven insights for admins (no company scope).
 * Reuses SmartInsight shape for frontend compatibility.
 */

import { Order, Shipment } from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';
import CacheService from '../../../../infrastructure/utilities/cache.service';
import type { SmartInsight } from './smart-insights.service';

const CACHE_KEY = 'admin_insights';
const CACHE_TTL_SEC = 3600; // 1 hour
const LAST_30_DAYS = 30;
const PREVIOUS_30_DAYS = 60;
/** Minimum delivery outcomes (delivered + shipped + rto) before showing success-rate insight (avoids noise from 0% with 1 RTO). */
const MIN_ATTEMPTED_FOR_SUCCESS_RATE_INSIGHT = 10;
/** Minimum RTO count before showing "top RTO reason" insight (avoids "100% — single reason" with 1 RTO). */
const MIN_RTO_COUNT_FOR_TOP_REASON_INSIGHT = 5;

/** Minimal types for aggregation results to avoid `any` */
interface CompanyStatRow {
    companyId?: unknown;
    companyName?: string;
    successRate?: number;
    attempted?: number;
    rto?: number;
}
interface RevenueRow {
    revenue?: number;
    companyId?: unknown;
    companyName?: string;
}
interface RTOReasonRow {
    _id?: string | null;
    count: number;
}

export default class AdminInsightsService {
    /**
     * Generate platform-level insights for admin dashboard. Returns top 5.
     */
    static async generateInsights(): Promise<SmartInsight[]> {
        const cached = await CacheService.get<SmartInsight[]>(CACHE_KEY);
        if (cached) return cached;

        try {
            const [
                rtoTrend,
                successRate,
                sellersAttention,
                revenueConcentration,
                topRTOReasons,
            ] = await Promise.all([
                this.analyzePlatformRTOTrend(),
                this.analyzePlatformSuccessRate(),
                this.getSellersNeedingAttention(),
                this.analyzeRevenueConcentration(),
                this.analyzeTopRTOReasonsPlatform(),
            ]);

            const insights: SmartInsight[] = [
                ...rtoTrend,
                ...successRate,
                ...sellersAttention,
                ...revenueConcentration,
                ...topRTOReasons,
            ];

            const priorityOrder: Record<SmartInsight['priority'], number> = { high: 0, medium: 1, low: 2 };
            const sorted = [...insights]
                .sort((a, b) => {
                    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                        return priorityOrder[a.priority] - priorityOrder[b.priority];
                    }
                    return (b.impact?.value ?? 0) - (a.impact?.value ?? 0);
                })
                .slice(0, 5);

            await CacheService.set(CACHE_KEY, sorted, CACHE_TTL_SEC);
            logger.info('Admin insights generated', { count: sorted.length });
            return sorted;
        } catch (error) {
            logger.error('Error generating admin insights:', error);
            throw error;
        }
    }

    private static async analyzePlatformRTOTrend(): Promise<SmartInsight[]> {
        const insights: SmartInsight[] = [];
        const now = new Date();
        const last30 = new Date(now);
        last30.setDate(last30.getDate() - LAST_30_DAYS);
        const prev30 = new Date(now);
        prev30.setDate(prev30.getDate() - PREVIOUS_30_DAYS);

        const [currentRTO, currentAttempted, previousRTO, previousAttempted] = await Promise.all([
            Order.countDocuments({
                isDeleted: false,
                currentStatus: 'rto',
                createdAt: { $gte: last30, $lte: now },
            }),
            Order.countDocuments({
                isDeleted: false,
                currentStatus: { $in: ['delivered', 'shipped', 'rto'] },
                createdAt: { $gte: last30, $lte: now },
            }),
            Order.countDocuments({
                isDeleted: false,
                currentStatus: 'rto',
                createdAt: { $gte: prev30, $lt: last30 },
            }),
            Order.countDocuments({
                isDeleted: false,
                currentStatus: { $in: ['delivered', 'shipped', 'rto'] },
                createdAt: { $gte: prev30, $lt: last30 },
            }),
        ]);

        const currentRate = currentAttempted > 0 ? (currentRTO / currentAttempted) * 100 : 0;
        const previousRate = previousAttempted > 0 ? (previousRTO / previousAttempted) * 100 : 0;
        const increasePct = previousRate > 0 ? ((currentRate - previousRate) / previousRate) * 100 : (currentRate > 0 ? 100 : 0);

        if (increasePct >= 25 && currentRTO > 0) {
            insights.push({
                id: `admin_rto_trend_${Date.now()}`,
                type: 'rto_prevention',
                priority: increasePct >= 50 ? 'high' : 'medium',
                title: 'Platform RTO rate increased',
                description: `RTO rate increased ${Math.round(increasePct)}% in the last 30 days across the platform (${currentRate.toFixed(1)}% vs ${previousRate.toFixed(1)}% previously).`,
                impact: {
                    metric: 'rto_rate_change',
                    value: Math.round(increasePct),
                    period: 'month',
                    formatted: `+${Math.round(increasePct)}% RTO rate`,
                },
                data: { currentRTO, currentRate, previousRate, currentAttempted, previousAttempted },
                action: {
                    type: 'manual',
                    label: 'View RTO / Disputes',
                    endpoint: '/admin/returns',
                },
                socialProof: `Based on ${currentAttempted} delivery outcomes in last 30 days`,
                confidence: 85,
                createdAt: new Date(),
            });
        }
        return insights;
    }

    private static async analyzePlatformSuccessRate(): Promise<SmartInsight[]> {
        const insights: SmartInsight[] = [];
        const now = new Date();
        const last30 = new Date(now);
        last30.setDate(last30.getDate() - LAST_30_DAYS);

        const [delivered, attempted] = await Promise.all([
            Order.countDocuments({
                isDeleted: false,
                currentStatus: 'delivered',
                createdAt: { $gte: last30, $lte: now },
            }),
            Order.countDocuments({
                isDeleted: false,
                currentStatus: { $in: ['delivered', 'shipped', 'rto'] },
                createdAt: { $gte: last30, $lte: now },
            }),
        ]);

        const successRate = attempted > 0 ? (delivered / attempted) * 100 : 0;
        if (attempted >= MIN_ATTEMPTED_FOR_SUCCESS_RATE_INSIGHT && successRate < 85) {
            insights.push({
                id: `admin_success_rate_${Date.now()}`,
                type: 'efficiency',
                priority: successRate < 70 ? 'high' : 'medium',
                title: 'Platform success rate below target',
                description: `Overall delivery success rate is ${successRate.toFixed(1)}% (target 85%+). Review orders and NDR to improve.`,
                impact: {
                    metric: 'success_rate',
                    value: Math.round(successRate),
                    period: 'month',
                    formatted: `${successRate.toFixed(1)}% success rate`,
                },
                data: { delivered, attempted, successRate },
                action: {
                    type: 'manual',
                    label: 'View Analytics / Orders',
                    endpoint: '/admin/orders',
                },
                socialProof: `Based on ${attempted} delivery outcomes in last 30 days`,
                confidence: 90,
                createdAt: new Date(),
            });
        }
        return insights;
    }

    private static async getSellersNeedingAttention(): Promise<SmartInsight[]> {
        const insights: SmartInsight[] = [];
        const now = new Date();
        const last30 = new Date(now);
        last30.setDate(last30.getDate() - LAST_30_DAYS);

        const byCompany = await Order.aggregate([
            {
                $match: {
                    isDeleted: false,
                    companyId: { $exists: true, $ne: null },
                    createdAt: { $gte: last30, $lte: now },
                    currentStatus: { $in: ['delivered', 'shipped', 'rto', 'pending'] },
                },
            },
            {
                $group: {
                    _id: '$companyId',
                    delivered: { $sum: { $cond: [{ $eq: ['$currentStatus', 'delivered'] }, 1, 0] } },
                    attempted: { $sum: { $cond: [{ $in: ['$currentStatus', ['delivered', 'shipped', 'rto']] }, 1, 0] } },
                    rto: { $sum: { $cond: [{ $eq: ['$currentStatus', 'rto'] }, 1, 0] } },
                },
            },
            { $match: { attempted: { $gte: 5 } } },
            {
                $addFields: {
                    successRate: { $cond: [{ $eq: ['$attempted', 0] }, 0, { $multiply: [{ $divide: ['$delivered', '$attempted'] }, 100] }] },
                },
            },
            { $match: { $or: [{ successRate: { $lt: 70 } }, { rto: { $gte: 10 } }] } },
            { $sort: { successRate: 1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'companies',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'company',
                },
            },
            { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    companyId: '$_id',
                    companyName: '$company.name',
                    successRate: 1,
                    attempted: 1,
                    rto: 1,
                },
            },
        ]);

        if (byCompany.length > 0) {
            const count = byCompany.length;
            const names = (byCompany as CompanyStatRow[]).slice(0, 3).map((c) => c.companyName ?? 'Unknown').join(', ');
            insights.push({
                id: `admin_sellers_attention_${Date.now()}`,
                type: 'rto_prevention',
                priority: count >= 5 ? 'high' : 'medium',
                title: 'Sellers needing attention',
                description: `${count} seller(s) have success rate < 70% or high RTO (e.g. ${names}${count > 3 ? '…' : ''}). Review seller health.`,
                impact: {
                    metric: 'sellers_count',
                    value: count,
                    period: 'month',
                    formatted: `${count} seller(s)`,
                },
                data: { sellers: byCompany },
                action: {
                    type: 'manual',
                    label: 'View Seller Health',
                    endpoint: '/admin/sellers',
                },
                socialProof: `Based on last 30 days delivery outcomes`,
                confidence: 80,
                createdAt: new Date(),
            });
        }
        return insights;
    }

    private static async analyzeRevenueConcentration(): Promise<SmartInsight[]> {
        const insights: SmartInsight[] = [];
        const now = new Date();
        const last30 = new Date(now);
        last30.setDate(last30.getDate() - LAST_30_DAYS);

        const [topSellers, totalRevenue] = await Promise.all([
            Order.aggregate([
                { $match: { isDeleted: false, createdAt: { $gte: last30, $lte: now } } },
                { $group: { _id: '$companyId', revenue: { $sum: '$totals.total' } } },
                { $sort: { revenue: -1 } },
                { $limit: 5 },
                {
                    $lookup: {
                        from: 'companies',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'company',
                    },
                },
                { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
                { $project: { companyId: '$_id', companyName: '$company.name', revenue: 1 } },
            ]),
            Order.aggregate([
                { $match: { isDeleted: false, createdAt: { $gte: last30, $lte: now } } },
                { $group: { _id: null, total: { $sum: '$totals.total' } } },
            ]),
        ]);

        const total = (totalRevenue[0] as { total?: number } | undefined)?.total ?? 0;
        if (total > 0 && topSellers.length > 0) {
            const top5Revenue = (topSellers as RevenueRow[]).reduce((s, r) => s + (r.revenue ?? 0), 0);
            const share = (top5Revenue / total) * 100;
            if (share >= 75) {
                insights.push({
                    id: `admin_revenue_concentration_${Date.now()}`,
                    type: 'growth_opportunity',
                    priority: 'low',
                    title: 'Revenue concentration',
                    description: `Top 5 sellers drive ${share.toFixed(0)}% of platform revenue. Consider diversification.`,
                    impact: {
                        metric: 'concentration_pct',
                        value: Math.round(share),
                        period: 'month',
                        formatted: `${share.toFixed(0)}% from top 5`,
                    },
                    data: { topSellers, total, share },
                    action: {
                        type: 'manual',
                        label: 'View Sellers',
                        endpoint: '/admin/sellers',
                    },
                    socialProof: `Based on last 30 days revenue`,
                    confidence: 85,
                    createdAt: new Date(),
                });
            }
        }
        return insights;
    }

    private static async analyzeTopRTOReasonsPlatform(): Promise<SmartInsight[]> {
        const insights: SmartInsight[] = [];
        const now = new Date();
        const last30 = new Date(now);
        last30.setDate(last30.getDate() - LAST_30_DAYS);

        const reasons = await Shipment.aggregate([
            {
                $match: {
                    isDeleted: false,
                    currentStatus: { $regex: /rto/i },
                    createdAt: { $gte: last30, $lte: now },
                    'rtoDetails.rtoReason': { $exists: true, $ne: '' },
                },
            },
            { $group: { _id: '$rtoDetails.rtoReason', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
        ]);

        const total = (reasons as RTOReasonRow[]).reduce((s, r) => s + r.count, 0);
        if (reasons.length > 0 && total >= MIN_RTO_COUNT_FOR_TOP_REASON_INSIGHT) {
            const top = reasons[0] as RTOReasonRow;
            const pct = total > 0 ? (top.count / total) * 100 : 0;
            const reasonLabel = top._id ?? 'Unknown';
            insights.push({
                id: `admin_top_rto_reason_${Date.now()}`,
                type: 'rto_prevention',
                priority: pct >= 40 ? 'high' : 'medium',
                title: 'Top RTO reason on platform',
                description: `"${reasonLabel}" is #1 RTO reason (${pct.toFixed(0)}%). Review NDR/RTO flows to reduce.`,
                impact: {
                    metric: 'rto_reason_share',
                    value: Math.round(pct),
                    period: 'month',
                    formatted: `${pct.toFixed(0)}% — ${reasonLabel}`,
                },
                data: { topReason: reasonLabel, count: top.count, total, allReasons: reasons },
                action: {
                    type: 'manual',
                    label: 'View NDR',
                    endpoint: '/admin/ndr',
                },
                socialProof: `Based on ${total} RTO shipments in last 30 days`,
                confidence: 80,
                createdAt: new Date(),
            });
        }
        return insights;
    }
}
