/**
 * Ndr Analytics
 * 
 * Purpose: NDRAnalyticsService
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

import { NDREvent, PreventionEvent } from '../../../../infrastructure/database/mongoose/models';
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
        restockRate: number;
        dispositionBreakdown: Record<string, number>;
        avgQcTurnaroundHours?: number;
    }> {
        const matchFilter: any = { company: companyId };

        if (dateRange) {
            matchFilter.triggeredAt = {
                $gte: dateRange.start,
                $lte: dateRange.end,
            };
        }

        const [overall, byReason, byStatus, byDisposition, qcTurnaround] = await Promise.all([
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
            RTOEvent.aggregate([
                { $match: { ...matchFilter, disposition: { $exists: true, $ne: null } } },
                { $group: { _id: '$disposition.action', count: { $sum: 1 } } },
            ]),
            RTOEvent.aggregate([
                {
                    $match: {
                        ...matchFilter,
                        'qcResult.inspectedAt': { $exists: true, $ne: null },
                        triggeredAt: { $exists: true, $ne: null },
                    },
                },
                {
                    $project: {
                        hours: {
                            $divide: [
                                { $subtract: ['$qcResult.inspectedAt', '$triggeredAt'] },
                                3600000,
                            ],
                        },
                    },
                },
                { $group: { _id: null, avgHours: { $avg: '$hours' } } },
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

        const dispositionBreakdown: Record<string, number> = { restock: 0, refurb: 0, dispose: 0, claim: 0 };
        byDisposition.forEach((r) => {
            if (r._id && dispositionBreakdown[r._id] !== undefined) {
                dispositionBreakdown[r._id] = r.count;
            }
        });

        const completedCount =
            (byStatusMap.restocked || 0) +
            (byStatusMap.disposed || 0) +
            (byStatusMap.refurbishing || 0) +
            (byStatusMap.claim_filed || 0);
        const restockRate =
            completedCount > 0 && byStatusMap.restocked
                ? Math.round((byStatusMap.restocked / completedCount) * 1000) / 10
                : 0;

        const avgQcTurnaroundHours =
            qcTurnaround[0]?.avgHours != null ? Math.round(qcTurnaround[0].avgHours * 10) / 10 : undefined;

        return {
            total: overall[0]?.total || 0,
            byReason: byReasonMap,
            byStatus: byStatusMap,
            totalCharges: overall[0]?.totalCharges || 0,
            avgCharges: Math.round((overall[0]?.avgCharges || 0) * 100) / 100,
            restockRate,
            dispositionBreakdown,
            avgQcTurnaroundHours,
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
    /**
     * Get Customer Self-Service Metrics
     */
    static async getCustomerSelfServiceMetrics(
        companyId: string,
        dateRange?: DateRange
    ): Promise<{
        magicLinksSent: number;
        magicLinksClicked: number;
        ctr: number;
        customerResponses: number;
        responseRate: number;
        actionBreakdown: Record<string, number>;
    }> {
        const matchFilter: any = { company: companyId };
        if (dateRange) {
            matchFilter.detectedAt = { $gte: dateRange.start, $lte: dateRange.end };
        }

        const [events, clickedEvents] = await Promise.all([
            NDREvent.find(matchFilter).select('magicLinkClicked magicLinkClickedAt customerContacted customerResponse resolutionActions'),
            NDREvent.countDocuments({ ...matchFilter, magicLinkClicked: true })
        ]);

        const magicLinksSent = events.length; // Assuming every NDR sends a link (Phase 4 Logic)
        const customerResponses = events.filter(e => e.customerResponse || e.resolutionActions.some(a => ['update_address', 'request_reattempt', 'trigger_rto'].includes(a.actionType))).length;

        const actionBreakdown: Record<string, number> = {
            update_address: 0,
            request_reattempt: 0,
            cancel: 0
        };

        events.forEach(e => {
            e.resolutionActions.forEach(a => {
                if (a.actionType === 'update_address') actionBreakdown.update_address++;
                if (a.actionType === 'request_reattempt') actionBreakdown.request_reattempt++;
                if (a.actionType === 'trigger_rto') actionBreakdown.cancel++; // 'trigger_rto' via portal is cancellation
            });
        });

        return {
            magicLinksSent,
            magicLinksClicked: clickedEvents,
            ctr: magicLinksSent > 0 ? Math.round((clickedEvents / magicLinksSent) * 100) : 0,
            customerResponses,
            responseRate: magicLinksSent > 0 ? Math.round((customerResponses / magicLinksSent) * 100) : 0,
            actionBreakdown
        };
    }

    /**
     * Get Prevention Layer Metrics
     */
    static async getPreventionLayerMetrics(
        companyId: string,
        dateRange?: DateRange
    ): Promise<{
        addressValidationBlocks: number;
        phoneVerificationFailures: number;
        highRiskOrders: number;
        codVerificationBlocks: number;
        totalPrevented: number;
    }> {
        const matchFilter: any = { companyId }; // PreventionEvent uses companyId
        if (dateRange) {
            matchFilter.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
        }

        const stats = await PreventionEvent.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    _id: '$eventType',
                    blocked: {
                        $sum: { $cond: [{ $eq: ['$action', 'blocked'] }, 1, 0] }
                    },
                    flagged: {
                        $sum: { $cond: [{ $eq: ['$action', 'flagged'] }, 1, 0] }
                    }
                }
            }
        ]);

        const metrics = {
            addressValidationBlocks: 0,
            phoneVerificationFailures: 0,
            highRiskOrders: 0,
            codVerificationBlocks: 0,
            totalPrevented: 0
        };

        stats.forEach(s => {
            if (s._id === 'address_validation') metrics.addressValidationBlocks = s.blocked;
            if (s._id === 'phone_verification') metrics.phoneVerificationFailures = s.blocked;
            if (s._id === 'risk_scoring') metrics.highRiskOrders = s.flagged + s.blocked;
            if (s._id === 'cod_verification') metrics.codVerificationBlocks = s.blocked;
        });

        metrics.totalPrevented = metrics.addressValidationBlocks + metrics.phoneVerificationFailures + metrics.codVerificationBlocks;

        return metrics;
    }

    /**
     * Get ROI Metrics
     */
    static async getROIMetrics(
        companyId: string,
        dateRange?: DateRange
    ): Promise<{
        baselineRTOCost: number;
        currentRTOCost: number;
        savings: number;
        operationalCosts: number;
        netSavings: number;
        roi: number;
    }> {
        // Configuration Constants (Should be dynamic in future)
        const BASELINE_RTO_RATE = 0.26; // 26%
        const AVG_SHIPPING_COST = 80;
        const AVG_RTO_PENALTY = 50; // Forward + Reverse usually higher, simplified
        const SMS_COST = 0.20;
        const WHATSAPP_COST = 0.80;
        const EMAIL_COST = 0.00;

        // Get Current Stats
        const ndrStats = await this.getNDRStats(companyId, dateRange);

        // Calculate Estimated Total Shipments (Back-calculate from NDR count / Typical NDR Rate of 15% - just an estimate if not passed)
        // Better: Get total shipments count like in getNDRByCourier

        let totalShipments = 0;

        // Dynamic Import to avoid circular dep
        try {
            const ShipmentModule = await import('../../../../infrastructure/database/mongoose/models/logistics/shipping/core/shipment.model.js') as any;
            const Shipment = ShipmentModule.default;

            const shipQuery: any = { companyId };
            if (dateRange) shipQuery.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
            totalShipments = await Shipment.countDocuments(shipQuery);
        } catch (e) {
            logger.warn('Could not fetch total shipments for ROI', e);
            totalShipments = ndrStats.total * 5; // Fallback estimate
        }

        if (totalShipments === 0) return { baselineRTOCost: 0, currentRTOCost: 0, savings: 0, operationalCosts: 0, netSavings: 0, roi: 0 };

        // Calculations
        const baselineRTOs = Math.round(totalShipments * BASELINE_RTO_RATE);
        const baselineCost = baselineRTOs * (AVG_SHIPPING_COST + AVG_RTO_PENALTY);

        const currentRTOs = ndrStats.rtoTriggered; // From actual data
        const currentCost = currentRTOs * (AVG_SHIPPING_COST + AVG_RTO_PENALTY);

        const savings = Math.max(0, baselineCost - currentCost);

        // Operational Costs (Estimate based on NDR count)
        const ndrCount = ndrStats.total;
        const operationalCosts = Math.round(
            (ndrCount * SMS_COST * 2) + // 2 SMS per NDR
            (ndrCount * WHATSAPP_COST * 1.5) // 1.5 WA per NDR
        );

        const netSavings = savings - operationalCosts;
        const roi = operationalCosts > 0 ? Math.round((netSavings / operationalCosts) * 100) : 0;

        return {
            baselineRTOCost: baselineCost,
            currentRTOCost: currentCost,
            savings,
            operationalCosts,
            netSavings,
            roi
        };
    }

    /**
     * Get Weekly Trends Analysis
     */
    static async getWeeklyTrendAnalysis(
        companyId: string,
        weeks: number = 4
    ): Promise<{
        currentWeek: any;
        trends: any[];
        insights: string[];
    }> {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - (weeks * 7));

        const trends = await this.getNDRTrends(companyId, { start: startDate, end: endDate }, 'week');

        const insights: string[] = [];

        if (trends.length >= 2) {
            const current = trends[trends.length - 1];
            const previous = trends[trends.length - 2];

            // NDR Volume Trend
            if (current.count < previous.count) {
                const diff = Math.round(((previous.count - current.count) / previous.count) * 100);
                insights.push(`NDR volume decreased by ${diff}% compared to last week.`);
            } else if (current.count > previous.count) {
                const diff = Math.round(((current.count - previous.count) / previous.count) * 100);
                insights.push(`NDR volume increased by ${diff}% compared to last week.`);
            }

            // Resolution Rate Trend
            const currRate = current.count > 0 ? (current.resolved / current.count) : 0;
            const prevRate = previous.count > 0 ? (previous.resolved / previous.count) : 0;

            if (currRate > prevRate) {
                insights.push('Resolution rate is improving.');
            } else if (currRate < prevRate) {
                insights.push('Resolution rate dropped slightly.');
            }
        }

        return {
            currentWeek: trends[trends.length - 1] || {},
            trends,
            insights
        };
    }
}

