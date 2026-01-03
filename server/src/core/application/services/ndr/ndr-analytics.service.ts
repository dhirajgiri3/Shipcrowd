/**
 * NDRAnalyticsService
 *
 * NDR/RTO metrics and analytics.
 */

import { NDREvent } from '../../../../infrastructure/database/mongoose/models';
import { RTOEvent } from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';

interface DateRange {
    start: Date;
    end: Date;
}

interface NDRStats {
    total: number;
    active: number;
    resolved: number;
    escalated: number;
    rtoTriggered: number;
    resolutionRate: number;
    avgResolutionTime: number; // hours
}

interface NDRTrend {
    date: string;
    count: number;
    resolved: number;
    rtoTriggered: number;
}

export default class NDRAnalyticsService {
    /**
     * Get overall NDR statistics
     */
    static async getNDRStats(
        companyId: string,
        dateRange?: DateRange
    ): Promise<NDRStats> {
        const matchFilter: any = { company: companyId };

        if (dateRange) {
            matchFilter.detectedAt = {
                $gte: dateRange.start,
                $lte: dateRange.end,
            };
        }

        const [statusCounts, resolutionStats] = await Promise.all([
            NDREvent.aggregate([
                { $match: matchFilter },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                    },
                },
            ]),
            NDREvent.aggregate([
                { $match: { ...matchFilter, resolvedAt: { $exists: true } } },
                {
                    $project: {
                        resolutionTime: {
                            $divide: [
                                { $subtract: ['$resolvedAt', '$detectedAt'] },
                                1000 * 60 * 60, // Convert to hours
                            ],
                        },
                    },
                },
                {
                    $group: {
                        _id: null,
                        avgResolutionTime: { $avg: '$resolutionTime' },
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);

        const statusMap: Record<string, number> = {};
        statusCounts.forEach((s) => {
            statusMap[s._id] = s.count;
        });

        const total =
            (statusMap.detected || 0) +
            (statusMap.in_resolution || 0) +
            (statusMap.resolved || 0) +
            (statusMap.escalated || 0) +
            (statusMap.rto_triggered || 0);

        const resolved = statusMap.resolved || 0;
        const resolutionRate = total > 0 ? (resolved / total) * 100 : 0;

        return {
            total,
            active: (statusMap.detected || 0) + (statusMap.in_resolution || 0),
            resolved,
            escalated: statusMap.escalated || 0,
            rtoTriggered: statusMap.rto_triggered || 0,
            resolutionRate: Math.round(resolutionRate * 100) / 100,
            avgResolutionTime:
                Math.round((resolutionStats[0]?.avgResolutionTime || 0) * 100) / 100,
        };
    }

    /**
     * Get NDR breakdown by type
     */
    static async getNDRByType(
        companyId: string,
        dateRange?: DateRange
    ): Promise<Record<string, number>> {
        const matchFilter: any = { company: companyId };

        if (dateRange) {
            matchFilter.detectedAt = {
                $gte: dateRange.start,
                $lte: dateRange.end,
            };
        }

        const result = await NDREvent.aggregate([
            { $match: matchFilter },
            { $group: { _id: '$ndrType', count: { $sum: 1 } } },
        ]);

        const byType: Record<string, number> = {};
        result.forEach((r) => {
            byType[r._id || 'unknown'] = r.count;
        });

        return byType;
    }

    /**
     * Get NDR trends over time
     */
    static async getNDRTrends(
        companyId: string,
        dateRange: DateRange,
        groupBy: 'day' | 'week' | 'month' = 'day'
    ): Promise<NDRTrend[]> {
        const dateFormat = groupBy === 'day' ? '%Y-%m-%d' : groupBy === 'week' ? '%Y-W%V' : '%Y-%m';

        const result = await NDREvent.aggregate([
            {
                $match: {
                    company: companyId,
                    detectedAt: {
                        $gte: dateRange.start,
                        $lte: dateRange.end,
                    },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: dateFormat, date: '$detectedAt' },
                    },
                    count: { $sum: 1 },
                    resolved: {
                        $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
                    },
                    rtoTriggered: {
                        $sum: { $cond: [{ $eq: ['$status', 'rto_triggered'] }, 1, 0] },
                    },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        return result.map((r) => ({
            date: r._id,
            count: r.count,
            resolved: r.resolved,
            rtoTriggered: r.rtoTriggered,
        }));
    }

    /**
     * Get resolution success rates by action type
     */
    static async getResolutionRates(
        companyId: string
    ): Promise<Record<string, { total: number; successful: number; rate: number }>> {
        const result = await NDREvent.aggregate([
            { $match: { company: companyId } },
            { $unwind: '$resolutionActions' },
            {
                $group: {
                    _id: '$resolutionActions.actionType',
                    total: { $sum: 1 },
                    successful: {
                        $sum: { $cond: [{ $eq: ['$resolutionActions.result', 'success'] }, 1, 0] },
                    },
                },
            },
        ]);

        const rates: Record<string, any> = {};
        result.forEach((r) => {
            rates[r._id] = {
                total: r.total,
                successful: r.successful,
                rate: r.total > 0 ? Math.round((r.successful / r.total) * 100) : 0,
            };
        });

        return rates;
    }

    /**
     * Get RTO statistics
     */
    static async getRTOStats(
        companyId: string,
        dateRange?: DateRange
    ): Promise<{
        total: number;
        byReason: Record<string, number>;
        byStatus: Record<string, number>;
        totalCharges: number;
        avgCharges: number;
    }> {
        const matchFilter: any = { company: companyId };

        if (dateRange) {
            matchFilter.triggeredAt = {
                $gte: dateRange.start,
                $lte: dateRange.end,
            };
        }

        const [overall, byReason, byStatus] = await Promise.all([
            RTOEvent.aggregate([
                { $match: matchFilter },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        totalCharges: { $sum: '$rtoCharges' },
                        avgCharges: { $avg: '$rtoCharges' },
                    },
                },
            ]),
            RTOEvent.aggregate([
                { $match: matchFilter },
                { $group: { _id: '$rtoReason', count: { $sum: 1 } } },
            ]),
            RTOEvent.aggregate([
                { $match: matchFilter },
                { $group: { _id: '$returnStatus', count: { $sum: 1 } } },
            ]),
        ]);

        const byReasonMap: Record<string, number> = {};
        byReason.forEach((r) => {
            byReasonMap[r._id] = r.count;
        });

        const byStatusMap: Record<string, number> = {};
        byStatus.forEach((r) => {
            byStatusMap[r._id] = r.count;
        });

        return {
            total: overall[0]?.total || 0,
            byReason: byReasonMap,
            byStatus: byStatusMap,
            totalCharges: overall[0]?.totalCharges || 0,
            avgCharges: Math.round((overall[0]?.avgCharges || 0) * 100) / 100,
        };
    }

    /**
     * Get top NDR reasons
     */
    static async getTopNDRReasons(
        companyId: string,
        limit: number = 10
    ): Promise<{ reason: string; count: number; percentage: number }[]> {
        const result = await NDREvent.aggregate([
            { $match: { company: companyId } },
            { $group: { _id: '$ndrReason', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: limit },
        ]);

        const total = result.reduce((sum, r) => sum + r.count, 0);

        return result.map((r) => ({
            reason: r._id,
            count: r.count,
            percentage: total > 0 ? Math.round((r.count / total) * 100) : 0,
        }));
    }

    /**
     * Get NDR rate by courier
     * Joins NDREvent with Shipment to get carrier info and calculates NDR rates
     */
    static async getNDRByCourier(
        companyId: string,
        dateRange?: DateRange
    ): Promise<Record<string, { total: number; ndrCount: number; ndrRate: number }>> {
        // First, get total shipments per carrier
        const shipmentMatchFilter: any = { companyId };
        const ndrMatchFilter: any = { company: companyId };

        if (dateRange) {
            shipmentMatchFilter.createdAt = {
                $gte: dateRange.start,
                $lte: dateRange.end,
            };
            ndrMatchFilter.detectedAt = {
                $gte: dateRange.start,
                $lte: dateRange.end,
            };
        }

        // Import Shipment model dynamically to avoid circular dependencies
        const ShipmentModule = await import('../../../../infrastructure/database/mongoose/models/logistics/shipping/core/shipment.model.js') as any;
        const Shipment = ShipmentModule.default;

        // Get total shipments by carrier
        const totalShipmentsByCarrier = await Shipment.aggregate([
            { $match: shipmentMatchFilter },
            {
                $group: {
                    _id: '$carrier',
                    total: { $sum: 1 },
                },
            },
        ]);

        // Get NDR counts by carrier using aggregation with lookup
        const ndrByCarrier = await NDREvent.aggregate([
            { $match: ndrMatchFilter },
            {
                $lookup: {
                    from: 'shipments',
                    localField: 'shipment',
                    foreignField: '_id',
                    as: 'shipmentData',
                },
            },
            { $unwind: '$shipmentData' },
            {
                $group: {
                    _id: '$shipmentData.carrier',
                    ndrCount: { $sum: 1 },
                },
            },
        ]);

        // Build result map
        const result: Record<string, { total: number; ndrCount: number; ndrRate: number }> = {};

        // Initialize with total shipments
        totalShipmentsByCarrier.forEach((item: { _id: string; total: number }) => {
            if (item._id) {
                result[item._id] = {
                    total: item.total,
                    ndrCount: 0,
                    ndrRate: 0,
                };
            }
        });

        // Add NDR counts
        ndrByCarrier.forEach((item: { _id: string; ndrCount: number }) => {
            if (item._id) {
                if (!result[item._id]) {
                    result[item._id] = {
                        total: 0,
                        ndrCount: item.ndrCount,
                        ndrRate: 0,
                    };
                } else {
                    result[item._id].ndrCount = item.ndrCount;
                }
            }
        });

        // Calculate NDR rates
        Object.keys(result).forEach((carrier) => {
            const { total, ndrCount } = result[carrier];
            result[carrier].ndrRate = total > 0 ? Math.round((ndrCount / total) * 100 * 100) / 100 : 0;
        });

        logger.info('getNDRByCourier completed', {
            companyId,
            carriersAnalyzed: Object.keys(result).length,
            dateRange: dateRange ? { start: dateRange.start, end: dateRange.end } : 'all time',
        });

        return result;
    }

    /**
     * Get summary dashboard data
     */
    static async getDashboardSummary(
        companyId: string
    ): Promise<{
        ndr: NDRStats;
        rto: any;
        recentNDRs: any[];
        recentRTOs: any[];
    }> {
        const [ndrStats, rtoStats, recentNDRs, recentRTOs] = await Promise.all([
            this.getNDRStats(companyId),
            this.getRTOStats(companyId),
            NDREvent.find({ company: companyId })
                .sort({ detectedAt: -1 })
                .limit(10)
                .populate('shipment order'),
            RTOEvent.find({ company: companyId })
                .sort({ triggeredAt: -1 })
                .limit(10)
                .populate('shipment order'),
        ]);

        return {
            ndr: ndrStats,
            rto: rtoStats,
            recentNDRs,
            recentRTOs,
        };
    }
}
