import mongoose from 'mongoose';
import { RTOEvent, Shipment } from '../../../../infrastructure/database/mongoose/models';
import CourierProviderRegistry from '../courier/courier-provider-registry';

export interface RTOAnalyticsFilters {
    startDate?: string;
    endDate?: string;
    warehouseId?: string;
    rtoReason?: string;
}

interface ResolvedDateRange {
    start: Date;
    end: Date;
}

export interface RTOAnalyticsResponse {
    summary: {
        currentRate: number;
        previousRate: number;
        change: number;
        industryAverage: number;
        totalRTO: number;
        totalOrders: number;
        estimatedLoss: number;
        periodLabel: string;
    };
    stats: {
        total: number;
        byReason: Record<string, number>;
        byStatus: Record<string, number>;
        totalCharges: number;
        avgCharges: number;
        restockRate: number;
        dispositionBreakdown: Record<string, number>;
        avgQcTurnaroundHours?: number;
    };
    trend: Array<{ month: string; rate: number }>;
    byCourier: Array<{ courier: string; rate: number; count: number; total: number }>;
    byReason: Array<{ reason: string; label: string; percentage: number; count: number }>;
    recommendations: Array<{ type: string; message: string; impact?: string }>;
    period: {
        startDate: string;
        endDate: string;
    };
}

export default class RTOAnalyticsService {
    private static readonly INDUSTRY_RTO_AVG = 10.5;
    private static readonly FALLBACK_AVG_RTO_CHARGE = 80;

    private static readonly REASON_LABELS: Record<string, string> = {
        ndr_unresolved: 'Customer Unavailable',
        customer_cancellation: 'Customer Cancelled',
        qc_failure: 'QC Failure',
        refused: 'Order Refused',
        damaged_in_transit: 'Damaged in Transit',
        incorrect_product: 'Incorrect / Address',
        other: 'Other',
    };

    private static normalizeDateBoundary(raw: string, boundary: 'start' | 'end'): Date {
        const parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime())) {
            return parsed;
        }

        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            if (boundary === 'start') {
                parsed.setHours(0, 0, 0, 0);
            } else {
                parsed.setHours(23, 59, 59, 999);
            }
        }

        return parsed;
    }

    private static resolveDateRange(filters?: RTOAnalyticsFilters): ResolvedDateRange {
        if (filters?.startDate && filters?.endDate) {
            return {
                start: this.normalizeDateBoundary(filters.startDate, 'start'),
                end: this.normalizeDateBoundary(filters.endDate, 'end'),
            };
        }

        const now = new Date();
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        const start = new Date(end);
        start.setDate(start.getDate() - 29);
        start.setHours(0, 0, 0, 0);

        return { start, end };
    }

    private static toMongoId(id: string): mongoose.Types.ObjectId | string {
        return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
    }

    private static buildRtoMatch(
        companyId: string,
        range: ResolvedDateRange,
        filters?: RTOAnalyticsFilters
    ): Record<string, unknown> {
        const match: Record<string, unknown> = {
            company: this.toMongoId(companyId),
            triggeredAt: { $gte: range.start, $lte: range.end },
        };

        if (filters?.warehouseId) {
            match.warehouse = this.toMongoId(filters.warehouseId);
        }

        if (filters?.rtoReason) {
            match.rtoReason = filters.rtoReason;
        }

        return match;
    }

    private static buildShipmentMatch(
        companyId: string,
        range: ResolvedDateRange,
        filters?: RTOAnalyticsFilters
    ): Record<string, unknown> {
        const match: Record<string, unknown> = {
            companyId: this.toMongoId(companyId),
            createdAt: { $gte: range.start, $lte: range.end },
        };

        if (filters?.warehouseId) {
            const warehouse = this.toMongoId(filters.warehouseId);
            match.$or = [{ warehouseId: warehouse }, { 'pickupDetails.warehouseId': warehouse }];
        }

        return match;
    }

    private static toPeriodLabel(start: Date, end: Date): string {
        const days = Math.max(1, Math.ceil((end.getTime() - start.getTime() + 1) / (24 * 60 * 60 * 1000)));
        if (days === 1) return 'Today';
        if (days === 7) return 'Last 7 Days';
        if (days === 30) return 'Last 30 Days';
        return 'Custom Range';
    }

    private static toCanonicalCarrier(raw: unknown): string {
        const normalized = String(raw || 'unknown').trim().toLowerCase();
        const canonical = CourierProviderRegistry.toCanonical(normalized);
        return canonical || normalized || 'unknown';
    }

    private static toCarrierLabel(raw: unknown): string {
        return CourierProviderRegistry.getLabel(this.toCanonicalCarrier(raw));
    }

    private static buildMonthlyBuckets(range: ResolvedDateRange): Array<{ start: Date; end: Date; label: string }> {
        const buckets: Array<{ start: Date; end: Date; label: string }> = [];
        const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1, 0, 0, 0, 0);
        const endMonthStart = new Date(range.end.getFullYear(), range.end.getMonth(), 1, 0, 0, 0, 0);
        const multiYear = range.start.getFullYear() !== range.end.getFullYear();

        while (cursor <= endMonthStart) {
            const monthStart = new Date(cursor);
            const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);

            const boundedStart = monthStart < range.start ? new Date(range.start) : monthStart;
            const boundedEnd = monthEnd > range.end ? new Date(range.end) : monthEnd;

            if (boundedStart <= boundedEnd) {
                buckets.push({
                    start: boundedStart,
                    end: boundedEnd,
                    label: monthStart.toLocaleDateString('en-US', {
                        month: 'short',
                        ...(multiYear ? { year: 'numeric' } : {}),
                    }),
                });
            }

            cursor.setMonth(cursor.getMonth() + 1);
        }

        return buckets;
    }

    static async getAnalytics(companyId: string, filters?: RTOAnalyticsFilters): Promise<RTOAnalyticsResponse> {
        const range = this.resolveDateRange(filters);
        const currentRtoMatch = this.buildRtoMatch(companyId, range, filters);
        const currentShipmentMatch = this.buildShipmentMatch(companyId, range, filters);

        const periodMs = Math.max(24 * 60 * 60 * 1000, range.end.getTime() - range.start.getTime());
        const previousEnd = new Date(range.start.getTime() - 1);
        const previousStart = new Date(previousEnd.getTime() - periodMs);
        const previousRange: ResolvedDateRange = { start: previousStart, end: previousEnd };
        const previousRtoMatch = this.buildRtoMatch(companyId, previousRange, filters);
        const previousShipmentMatch = this.buildShipmentMatch(companyId, previousRange, filters);

        const [
            currentRTOs,
            currentShipments,
            previousRTOs,
            previousShipments,
            avgChargeResult,
            overallStats,
            reasonStats,
            statusStats,
            dispositionStats,
            qcTurnaround,
            courierBreakdownRaw,
            courierTotalsRaw,
        ] = await Promise.all([
            RTOEvent.countDocuments(currentRtoMatch),
            Shipment.countDocuments(currentShipmentMatch),
            RTOEvent.countDocuments(previousRtoMatch),
            Shipment.countDocuments(previousShipmentMatch),
            RTOEvent.aggregate([
                {
                    $match: {
                        ...currentRtoMatch,
                        rtoCharges: { $gt: 0 },
                    },
                },
                { $group: { _id: null, avgCharge: { $avg: '$rtoCharges' } } },
            ]),
            RTOEvent.aggregate([
                { $match: currentRtoMatch },
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
                { $match: currentRtoMatch },
                { $group: { _id: '$rtoReason', count: { $sum: 1 } } },
            ]),
            RTOEvent.aggregate([
                { $match: currentRtoMatch },
                { $group: { _id: '$returnStatus', count: { $sum: 1 } } },
            ]),
            RTOEvent.aggregate([
                { $match: { ...currentRtoMatch, disposition: { $exists: true, $ne: null } } },
                { $group: { _id: '$disposition.action', count: { $sum: 1 } } },
            ]),
            RTOEvent.aggregate([
                {
                    $match: {
                        ...currentRtoMatch,
                        'qcResult.inspectedAt': { $exists: true, $ne: null },
                    },
                },
                {
                    $project: {
                        hours: {
                            $divide: [{ $subtract: ['$qcResult.inspectedAt', '$triggeredAt'] }, 3600000],
                        },
                    },
                },
                { $group: { _id: null, avgHours: { $avg: '$hours' } } },
            ]),
            RTOEvent.aggregate([
                { $match: currentRtoMatch },
                {
                    $lookup: {
                        from: 'shipments',
                        localField: 'shipment',
                        foreignField: '_id',
                        as: 'shipmentDetails',
                    },
                },
                {
                    $unwind: {
                        path: '$shipmentDetails',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $group: {
                        _id: '$shipmentDetails.carrier',
                        rtoCount: { $sum: 1 },
                    },
                },
            ]),
            Shipment.aggregate([
                { $match: currentShipmentMatch },
                { $group: { _id: '$carrier', total: { $sum: 1 } } },
            ]),
        ]);

        const currentRate = currentShipments > 0 ? (currentRTOs / currentShipments) * 100 : 0;
        const previousRate = previousShipments > 0 ? (previousRTOs / previousShipments) * 100 : 0;
        const change = previousRate > 0 ? currentRate - previousRate : currentRate;

        const avgRTOCharge = avgChargeResult[0]?.avgCharge
            ? Math.round(avgChargeResult[0].avgCharge)
            : this.FALLBACK_AVG_RTO_CHARGE;
        const estimatedLoss = currentRTOs * avgRTOCharge;

        const overallStatsSafe = Array.isArray(overallStats) ? overallStats : [];
        const reasonStatsSafe = Array.isArray(reasonStats) ? reasonStats : [];
        const statusStatsSafe = Array.isArray(statusStats) ? statusStats : [];
        const dispositionStatsSafe = Array.isArray(dispositionStats) ? dispositionStats : [];
        const qcTurnaroundSafe = Array.isArray(qcTurnaround) ? qcTurnaround : [];
        const courierBreakdownSafe = Array.isArray(courierBreakdownRaw) ? courierBreakdownRaw : [];
        const courierTotalsSafe = Array.isArray(courierTotalsRaw) ? courierTotalsRaw : [];

        const byReasonMap: Record<string, number> = {};
        reasonStatsSafe.forEach((r: { _id: string; count: number }) => {
            if (r._id) byReasonMap[r._id] = r.count;
        });

        const byStatusMap: Record<string, number> = {};
        statusStatsSafe.forEach((r: { _id: string; count: number }) => {
            if (r._id) byStatusMap[r._id] = r.count;
        });

        const dispositionBreakdown: Record<string, number> = { restock: 0, refurb: 0, dispose: 0, claim: 0 };
        dispositionStatsSafe.forEach((r: { _id: string; count: number }) => {
            if (r._id && dispositionBreakdown[r._id] !== undefined) {
                dispositionBreakdown[r._id] = r.count;
            }
        });

        const completedCount =
            (byStatusMap.restocked || 0) +
            (byStatusMap.disposed || 0) +
            (byStatusMap.refurbishing || 0) +
            (byStatusMap.claim_filed || 0);
        const restockRate = completedCount > 0 ? Math.round(((byStatusMap.restocked || 0) / completedCount) * 1000) / 10 : 0;
        const avgQcTurnaroundHours =
            qcTurnaroundSafe[0]?.avgHours != null ? Math.round(qcTurnaroundSafe[0].avgHours * 10) / 10 : undefined;

        const courierTotalsMap = new Map<string, number>();
        courierTotalsSafe.forEach((c: { _id: string; total: number }) => {
            const key = this.toCanonicalCarrier(c._id);
            courierTotalsMap.set(key, (courierTotalsMap.get(key) || 0) + c.total);
        });

        const courierRtoMap = new Map<string, number>();
        courierBreakdownSafe.forEach((c: { _id: string; rtoCount: number }) => {
            const key = this.toCanonicalCarrier(c._id);
            courierRtoMap.set(key, (courierRtoMap.get(key) || 0) + c.rtoCount);
        });

        const allCarriers = new Set<string>([...courierTotalsMap.keys(), ...courierRtoMap.keys()]);
        const byCourier = Array.from(allCarriers)
            .map((carrier) => {
                const total = courierTotalsMap.get(carrier) || 0;
                const count = courierRtoMap.get(carrier) || 0;
                const rate = total > 0 ? (count / total) * 100 : 0;
                return {
                    courier: this.toCarrierLabel(carrier),
                    rate: Math.round(rate * 10) / 10,
                    count,
                    total,
                };
            })
            .sort((a, b) => a.rate - b.rate);

        const totalReasonCount = reasonStatsSafe.reduce((sum, r: { count: number }) => sum + r.count, 0);
        const byReason = reasonStatsSafe
            .filter((item: { _id?: string; count: number }) => Boolean(item?._id))
            .map((item: { _id: string; count: number }) => ({
                reason: item._id,
                label: this.REASON_LABELS[item._id] || item._id,
                percentage: totalReasonCount > 0 ? Math.round((item.count / totalReasonCount) * 100) : 0,
                count: item.count,
            }))
            .sort((a, b) => b.percentage - a.percentage);

        const recommendations: Array<{ type: string; message: string; impact?: string }> = [];

        if (byCourier.length > 1) {
            const best = byCourier[0];
            const worst = byCourier[byCourier.length - 1];
            if (worst.rate - best.rate > 3) {
                const savings = Math.round((worst.count - (worst.total * best.rate / 100)) * avgRTOCharge);
                recommendations.push({
                    type: 'courier_switch',
                    message: `Switch orders from ${worst.courier} to ${best.courier}`,
                    impact: `Save ₹${Math.max(0, savings).toLocaleString()}/month`,
                });
            }
        }

        const addressReason = byReason.find((r) => r.reason === 'incorrect_product');
        if (addressReason && addressReason.percentage > 10) {
            recommendations.push({
                type: 'verification',
                message: 'Enable address verification before dispatch',
                impact: 'Reduce incorrect address RTOs by 40%',
            });
        }

        const unavailableReason = byReason.find((r) => r.reason === 'ndr_unresolved');
        if (unavailableReason && unavailableReason.percentage > 30) {
            recommendations.push({
                type: 'verification',
                message: 'Enable IVR confirmation for COD orders above ₹1,000',
                impact: 'Reduce customer unavailable by 25%',
            });
        }

        const trendBuckets = this.buildMonthlyBuckets(range);
        const trendPairs = await Promise.all(
            trendBuckets.map(async (bucket) => {
                const monthRange: ResolvedDateRange = { start: bucket.start, end: bucket.end };
                const monthRtoMatch = this.buildRtoMatch(companyId, monthRange, filters);
                const monthShipmentMatch = this.buildShipmentMatch(companyId, monthRange, filters);
                const [rtos, shipments] = await Promise.all([
                    RTOEvent.countDocuments(monthRtoMatch),
                    Shipment.countDocuments(monthShipmentMatch),
                ]);
                const rate = shipments > 0 ? (rtos / shipments) * 100 : 0;
                return {
                    month: bucket.label,
                    rate: Math.round(rate * 10) / 10,
                };
            })
        );

        return {
            summary: {
                currentRate: Math.round(currentRate * 10) / 10,
                previousRate: Math.round(previousRate * 10) / 10,
                change: Math.round(change * 10) / 10,
                industryAverage: this.INDUSTRY_RTO_AVG,
                totalRTO: currentRTOs,
                totalOrders: currentShipments,
                estimatedLoss,
                periodLabel: this.toPeriodLabel(range.start, range.end),
            },
            stats: {
                total: overallStatsSafe[0]?.total || 0,
                byReason: byReasonMap,
                byStatus: byStatusMap,
                totalCharges: overallStatsSafe[0]?.totalCharges || 0,
                avgCharges: Math.round((overallStatsSafe[0]?.avgCharges || 0) * 100) / 100,
                restockRate,
                dispositionBreakdown,
                avgQcTurnaroundHours,
            },
            trend: trendPairs,
            byCourier,
            byReason,
            recommendations,
            period: {
                startDate: range.start.toISOString(),
                endDate: range.end.toISOString(),
            },
        };
    }
}
