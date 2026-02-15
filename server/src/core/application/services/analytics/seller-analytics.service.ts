import mongoose from 'mongoose';
import { Shipment } from '../../../../infrastructure/database/mongoose/models';
import CourierProviderRegistry from '../courier/courier-provider-registry';
import { CODAnalyticsService } from '../finance/cod-analytics.service';
import NDRAnalyticsService from '../ndr/ndr-analytics.service';
import RTOService from '../rto/rto.service';
import CarrierNormalizationService from '../shipping/carrier-normalization.service';
import OrderAnalyticsService from './order-analytics.service';
import ShipmentAnalyticsService from './shipment-analytics.service';

export interface SellerAnalyticsDateRange {
    start: Date;
    end: Date;
}

interface SellerAnalyticsFilters {
    startDate?: string;
    endDate?: string;
    dateRange?: string;
}

const DEFAULT_PICKUP_SLA_TARGET = 98;
const DEFAULT_DELIVERY_SLA_TARGET = 95;
const DEFAULT_NDR_RESPONSE_TARGET_HOURS = 4;
const DEFAULT_COD_SETTLEMENT_TARGET_DAYS = 3;

const startOfDay = (date: Date) => {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
};

const endOfDay = (date: Date) => {
    const next = new Date(date);
    next.setHours(23, 59, 59, 999);
    return next;
};

const round = (value: number, precision = 2) => {
    const factor = 10 ** precision;
    return Math.round(value * factor) / factor;
};

const normalizeCarrierKey = (value: unknown) => String(value || 'unknown').trim().toLowerCase();
const toCarrierId = (value: unknown) => normalizeCarrierKey(value).replace(/\s+/g, '_');
const canonicalizeCarrierKey = (value: unknown) => {
    const normalized = normalizeCarrierKey(value);
    const canonical = CourierProviderRegistry.toCanonical(normalized);
    if (canonical) return canonical;
    // Resolve service types (surface, express, etc.) to velocity - they are NOT courier providers
    if (CarrierNormalizationService.isServiceType(normalized)) return 'velocity';
    return normalized;
};

const toCarrierLabel = (value: unknown) => {
    const normalized = canonicalizeCarrierKey(value);
    if (!normalized || normalized === 'unknown') return 'Unknown';
    return normalized
        .split(/\s+|_/g)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
};

const buildStatus = (value: number, target: number, inverse = false): 'excellent' | 'good' | 'warning' | 'critical' => {
    if (!inverse) {
        if (value >= target + 2) return 'excellent';
        if (value >= target) return 'good';
        if (value >= target - 5) return 'warning';
        return 'critical';
    }

    if (value <= target * 0.8) return 'excellent';
    if (value <= target) return 'good';
    if (value <= target * 1.3) return 'warning';
    return 'critical';
};

type CostCourierRow = {
    courierId: string;
    courierName: string;
    shipmentCount: number;
    cost: number;
    avgCostPerShipment: number;
};

const mergeCostCourierRows = (rows: any[]): CostCourierRow[] => {
    const merged = new Map<string, { shipmentCount: number; cost: number }>();

    rows.forEach((row: any) => {
        const key = canonicalizeCarrierKey(row?.courierId || row?.courierName || row?._id);
        const current = merged.get(key) || { shipmentCount: 0, cost: 0 };
        current.shipmentCount += Number(row?.shipmentCount || 0);
        current.cost += Number(row?.cost || 0);
        merged.set(key, current);
    });

    return Array.from(merged.entries())
        .map(([key, value]) => ({
            courierId: toCarrierId(key),
            courierName: toCarrierLabel(key),
            shipmentCount: value.shipmentCount,
            cost: round(value.cost, 2),
            avgCostPerShipment: value.shipmentCount > 0 ? round(value.cost / value.shipmentCount, 2) : 0,
        }))
        .sort((a, b) => b.cost - a.cost);
};

export default class SellerAnalyticsService {
    static resolveDateRange(filters?: SellerAnalyticsFilters): SellerAnalyticsDateRange {
        const now = new Date();

        if (filters?.startDate && filters?.endDate) {
            return {
                start: startOfDay(new Date(filters.startDate)),
                end: endOfDay(new Date(filters.endDate)),
            };
        }

        const range = filters?.dateRange;
        if (range === 'today') {
            return { start: startOfDay(now), end: endOfDay(now) };
        }
        if (range === 'yesterday') {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
        }

        const days = range === '7days' ? 7 : range === '90days' ? 90 : 30;
        const start = new Date(now);
        start.setDate(start.getDate() - days + 1);
        return { start: startOfDay(start), end: endOfDay(now) };
    }

    private static getPreviousRange(range: SellerAnalyticsDateRange): SellerAnalyticsDateRange {
        const durationMs = Math.max(24 * 60 * 60 * 1000, range.end.getTime() - range.start.getTime());
        const previousEnd = new Date(range.start.getTime() - 1);
        const previousStart = new Date(previousEnd.getTime() - durationMs);
        return {
            start: startOfDay(previousStart),
            end: endOfDay(previousEnd),
        };
    }

    private static async aggregateCostBreakdown(companyId: string, dateRange: SellerAnalyticsDateRange) {
        const companyObjectId = new mongoose.Types.ObjectId(companyId);

        const [summary] = await Shipment.aggregate([
            {
                $match: {
                    companyId: companyObjectId,
                    isDeleted: false,
                    createdAt: { $gte: dateRange.start, $lte: dateRange.end },
                },
            },
            {
                $group: {
                    _id: null,
                    shipmentCount: { $sum: 1 },
                    shippingCost: { $sum: { $ifNull: ['$paymentDetails.shippingCost', 0] } },
                    codCharges: {
                        $sum: {
                            $ifNull: ['$paymentDetails.codCharges', { $ifNull: ['$pricingDetails.codCharge', 0] }],
                        },
                    },
                    weightCharges: {
                        $sum: {
                            $ifNull: [
                                '$pricingDetails.weightCharge',
                                {
                                    $ifNull: [
                                        '$pricingDetails.selectedQuote.costBreakdown.weightCharge',
                                        {
                                            $ifNull: [
                                                '$pricingDetails.selectedQuote.sellBreakdown.weightCharge',
                                                0,
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                    fuelSurcharge: {
                        $sum: {
                            $ifNull: [
                                '$pricingDetails.selectedQuote.costBreakdown.fuelSurcharge',
                                { $ifNull: ['$pricingDetails.selectedQuote.sellBreakdown.fuelSurcharge', 0] },
                            ],
                        },
                    },
                    otherCharges: {
                        $sum: {
                            $add: [
                                { $ifNull: ['$pricingDetails.gstAmount', 0] },
                                { $ifNull: ['$carrierDetails.charges.platformFee', 0] },
                            ],
                        },
                    },
                },
            },
        ]);

        const rtoAnalytics = await RTOService.getRTOAnalytics(companyId, dateRange);

        const normalized = {
            shipmentCount: summary?.shipmentCount || 0,
            shippingCost: round(summary?.shippingCost || 0),
            codCharges: round(summary?.codCharges || 0),
            weightCharges: round(summary?.weightCharges || 0),
            fuelSurcharge: round(summary?.fuelSurcharge || 0),
            rtoCharges: round(rtoAnalytics.summary.estimatedLoss || 0),
            otherCharges: round(summary?.otherCharges || 0),
        };

        const totalCost = round(
            normalized.shippingCost +
            normalized.codCharges +
            normalized.weightCharges +
            normalized.fuelSurcharge +
            normalized.rtoCharges +
            normalized.otherCharges
        );

        return {
            totalCost,
            breakdown: {
                shippingCost: normalized.shippingCost,
                codCharges: normalized.codCharges,
                weightCharges: normalized.weightCharges,
                fuelSurcharge: normalized.fuelSurcharge,
                rtoCharges: normalized.rtoCharges,
                otherCharges: normalized.otherCharges,
            },
            shipmentCount: normalized.shipmentCount,
        };
    }

    static async getCostAnalysis(companyId: string, filters?: SellerAnalyticsFilters) {
        const dateRange = this.resolveDateRange(filters);
        const previousRange = this.getPreviousRange(dateRange);
        const companyObjectId = new mongoose.Types.ObjectId(companyId);

        const [current, previous, orderStats, byCourier, byZone, byPaymentMethod, timeSeries] = await Promise.all([
            this.aggregateCostBreakdown(companyId, dateRange),
            this.aggregateCostBreakdown(companyId, previousRange),
            OrderAnalyticsService.getOrderStats(companyId, dateRange),
            Shipment.aggregate([
                {
                    $match: {
                        companyId: companyObjectId,
                        isDeleted: false,
                        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
                    },
                },
                {
                    $project: {
                        carrierKey: {
                            $toLower: {
                                $trim: {
                                    input: { $ifNull: ['$carrier', 'unknown'] },
                                },
                            },
                        },
                        shippingCost: { $ifNull: ['$paymentDetails.shippingCost', 0] },
                        codCharges: {
                            $ifNull: [
                                '$paymentDetails.codCharges',
                                { $ifNull: ['$pricingDetails.codCharge', 0] },
                            ],
                        },
                    },
                },
                {
                    $group: {
                        _id: '$carrierKey',
                        shipmentCount: { $sum: 1 },
                        cost: {
                            $sum: {
                                $add: ['$shippingCost', '$codCharges'],
                            },
                        },
                    },
                },
                { $sort: { cost: -1 } },
                {
                    $project: {
                        _id: 0,
                        courierId: { $replaceAll: { input: { $ifNull: ['$_id', 'unknown'] }, find: ' ', replacement: '_' } },
                        courierName: { $ifNull: ['$_id', 'unknown'] },
                        shipmentCount: 1,
                        cost: { $round: ['$cost', 2] },
                        avgCostPerShipment: {
                            $cond: [{ $gt: ['$shipmentCount', 0] }, { $round: [{ $divide: ['$cost', '$shipmentCount'] }, 2] }, 0],
                        },
                    },
                },
            ]),
            Shipment.aggregate([
                {
                    $match: {
                        companyId: companyObjectId,
                        isDeleted: false,
                        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
                    },
                },
                {
                    $group: {
                        _id: { $ifNull: ['$deliveryDetails.address.state', 'Unknown'] },
                        shipmentCount: { $sum: 1 },
                        cost: {
                            $sum: {
                                $add: [
                                    { $ifNull: ['$paymentDetails.shippingCost', 0] },
                                    {
                                        $ifNull: [
                                            '$paymentDetails.codCharges',
                                            { $ifNull: ['$pricingDetails.codCharge', 0] },
                                        ],
                                    },
                                ],
                            },
                        },
                    },
                },
                { $sort: { cost: -1 } },
                {
                    $project: {
                        _id: 0,
                        zoneName: '$_id',
                        shipmentCount: 1,
                        cost: { $round: ['$cost', 2] },
                        avgCostPerShipment: {
                            $cond: [{ $gt: ['$shipmentCount', 0] }, { $round: [{ $divide: ['$cost', '$shipmentCount'] }, 2] }, 0],
                        },
                    },
                },
            ]),
            Shipment.aggregate([
                {
                    $match: {
                        companyId: companyObjectId,
                        isDeleted: false,
                        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
                    },
                },
                {
                    $group: {
                        _id: {
                            $cond: [
                                { $eq: [{ $toLower: { $ifNull: ['$paymentDetails.type', ''] } }, 'cod'] },
                                'cod',
                                'prepaid',
                            ],
                        },
                        count: { $sum: 1 },
                        cost: {
                            $sum: {
                                $add: [
                                    { $ifNull: ['$paymentDetails.shippingCost', 0] },
                                    {
                                        $ifNull: [
                                            '$paymentDetails.codCharges',
                                            { $ifNull: ['$pricingDetails.codCharge', 0] },
                                        ],
                                    },
                                ],
                            },
                        },
                    },
                },
            ]),
            Shipment.aggregate([
                {
                    $match: {
                        companyId: companyObjectId,
                        isDeleted: false,
                        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
                    },
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        shippingCost: { $sum: { $ifNull: ['$paymentDetails.shippingCost', 0] } },
                        codCharges: {
                            $sum: {
                                $ifNull: [
                                    '$paymentDetails.codCharges',
                                    { $ifNull: ['$pricingDetails.codCharge', 0] },
                                ],
                            },
                        },
                    },
                },
                {
                    $addFields: {
                        totalCost: { $add: ['$shippingCost', '$codCharges'] },
                    },
                },
                { $sort: { _id: 1 } },
                {
                    $project: {
                        _id: 0,
                        date: '$_id',
                        totalCost: { $round: ['$totalCost', 2] },
                        shippingCost: { $round: ['$shippingCost', 2] },
                        codCharges: { $round: ['$codCharges', 2] },
                    },
                },
            ]),
        ]);

        const codRow = byPaymentMethod.find((row: any) => row._id === 'cod');
        const prepaidRow = byPaymentMethod.find((row: any) => row._id === 'prepaid');

        const normalizedByCourier = mergeCostCourierRows(byCourier as any[]);

        const minCourierAvg = normalizedByCourier.length > 0 ? Math.min(...normalizedByCourier.map((row: any) => row.avgCostPerShipment)) : 0;
        const expensiveCourier = normalizedByCourier[0];

        const savingsOpportunities = [] as Array<{
            id: string;
            type: 'courier_switch' | 'weight_audit' | 'zone_optimization' | 'cod_reduction';
            title: string;
            description: string;
            potentialSavings: number;
            impact: 'high' | 'medium' | 'low';
            effort: 'easy' | 'moderate' | 'complex';
            recommendation: string;
        }>;

        if (expensiveCourier && minCourierAvg > 0 && expensiveCourier.avgCostPerShipment > minCourierAvg) {
            const potential = round((expensiveCourier.avgCostPerShipment - minCourierAvg) * expensiveCourier.shipmentCount);
            if (potential > 0) {
                savingsOpportunities.push({
                    id: 'courier-switch',
                    type: 'courier_switch',
                    title: `Optimize ${expensiveCourier.courierName} allocation`,
                    description: 'Shift eligible volume to your most cost-efficient carrier.',
                    potentialSavings: potential,
                    impact: potential > 10000 ? 'high' : 'medium',
                    effort: 'moderate',
                    recommendation: `Move low-priority lanes from ${expensiveCourier.courierName} to a lower-cost courier where SLA allows.`,
                });
            }
        }

        if ((codRow?.cost || 0) > 0) {
            const potential = round((codRow.cost || 0) * 0.1);
            savingsOpportunities.push({
                id: 'cod-reduction',
                type: 'cod_reduction',
                title: 'Reduce COD handling cost',
                description: 'Increase prepaid adoption to reduce COD-linked charges.',
                potentialSavings: potential,
                impact: potential > 5000 ? 'high' : 'medium',
                effort: 'easy',
                recommendation: 'Promote prepaid discounts for repeat buyers and high-RTO lanes.',
            });
        }

        return {
            current: {
                totalCost: current.totalCost,
                breakdown: current.breakdown,
                shipmentCount: current.shipmentCount,
                byCourier: normalizedByCourier,
                byZone,
                byPaymentMethod: {
                    cod: { cost: round(codRow?.cost || 0), count: codRow?.count || 0 },
                    prepaid: { cost: round(prepaidRow?.cost || 0), count: prepaidRow?.count || 0 },
                },
                timeSeries,
            },
            previous: {
                totalCost: previous.totalCost,
                breakdown: previous.breakdown,
                byCourier: [],
                byZone: [],
                byPaymentMethod: {
                    cod: { cost: 0, count: 0 },
                    prepaid: { cost: 0, count: 0 },
                },
                timeSeries: [],
            },
            savingsOpportunities,
            metadata: {
                totalOrders: orderStats.totalOrders,
                averageOrderValue: orderStats.averageOrderValue,
                dateRange: {
                    startDate: dateRange.start.toISOString(),
                    endDate: dateRange.end.toISOString(),
                },
            },
        };
    }

    static async getCourierComparison(companyId: string, filters?: SellerAnalyticsFilters) {
        const dateRange = this.resolveDateRange(filters);
        const companyObjectId = new mongoose.Types.ObjectId(companyId);

        const RTO_STATUSES = ['rto', 'rto_delivered', 'rto_initiated', 'rto_in_transit', 'returned', 'return_initiated'];
        const NDR_STATUSES = ['ndr', 'undelivered', 'delivery_failed'];

        const [shipmentsByCourier, codHealth, shipmentPerformance] = await Promise.all([
            Shipment.aggregate([
                {
                    $match: {
                        companyId: companyObjectId,
                        isDeleted: false,
                        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
                    },
                },
                {
                    $addFields: {
                        carrierKey: {
                            $cond: {
                                if: {
                                    $in: [
                                        { $toLower: { $trim: { $ifNull: ['$carrier', ''] } } },
                                        ['surface', 'express', 'air', 'standard', 'economy', 'ground', 'road'],
                                    ],
                                },
                                then: 'velocity',
                                else: { $toLower: { $trim: { $ifNull: ['$carrier', 'unknown'] } } },
                            },
                        },
                    },
                },
                {
                    $project: {
                        carrierKey: 1,
                        currentStatus: 1,
                        paymentDetails: 1,
                        actualDelivery: 1,
                        estimatedDelivery: 1,
                        createdAt: 1,
                    },
                },
                {
                    $group: {
                        _id: '$carrierKey',
                        totalShipments: { $sum: 1 },
                        delivered: { $sum: { $cond: [{ $eq: ['$currentStatus', 'delivered'] }, 1, 0] } },
                        rto: {
                            $sum: {
                                $cond: [{ $in: ['$currentStatus', RTO_STATUSES] }, 1, 0],
                            },
                        },
                        ndr: {
                            $sum: {
                                $cond: [{ $in: ['$currentStatus', NDR_STATUSES] }, 1, 0],
                            },
                        },
                        damaged: { $sum: { $cond: [{ $eq: ['$currentStatus', 'damaged'] }, 1, 0] } },
                        lost: { $sum: { $cond: [{ $eq: ['$currentStatus', 'lost'] }, 1, 0] } },
                        totalCost: {
                            $sum: {
                                $add: [
                                    { $ifNull: ['$paymentDetails.shippingCost', 0] },
                                    {
                                        $ifNull: [
                                            '$paymentDetails.codCharges',
                                            { $ifNull: ['$pricingDetails.codCharge', 0] },
                                        ],
                                    },
                                ],
                            },
                        },
                        totalDeliveryHours: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ['$currentStatus', 'delivered'] },
                                            { $ne: ['$actualDelivery', null] },
                                            { $gt: ['$actualDelivery', '$createdAt'] },
                                        ],
                                    },
                                    { $divide: [{ $subtract: ['$actualDelivery', '$createdAt'] }, 1000 * 60 * 60] },
                                    0,
                                ],
                            },
                        },
                        deliveredWithTime: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ['$currentStatus', 'delivered'] },
                                            { $ne: ['$actualDelivery', null] },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        onTimeDelivered: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ['$currentStatus', 'delivered'] },
                                            { $ne: ['$actualDelivery', null] },
                                            { $ne: ['$estimatedDelivery', null] },
                                            { $lte: ['$actualDelivery', '$estimatedDelivery'] },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                    },
                },
                { $sort: { totalShipments: -1 } },
            ]),
            CODAnalyticsService.getHealthMetrics(companyId, dateRange.start, dateRange.end),
            ShipmentAnalyticsService.getCourierPerformance(companyId, dateRange),
        ]);

        const performanceMap = new Map(
            shipmentPerformance.map((item) => [canonicalizeCarrierKey(item.carrier), item])
        );

        const courierAggregate = new Map<string, {
            totalShipments: number;
            delivered: number;
            rto: number;
            ndr: number;
            damaged: number;
            lost: number;
            totalCost: number;
            totalDeliveryHours: number;
            deliveredWithTime: number;
            onTimeDelivered: number;
        }>();

        shipmentsByCourier.forEach((item: any) => {
            const key = canonicalizeCarrierKey(item._id);
            const current = courierAggregate.get(key) || {
                totalShipments: 0,
                delivered: 0,
                rto: 0,
                ndr: 0,
                damaged: 0,
                lost: 0,
                totalCost: 0,
                totalDeliveryHours: 0,
                deliveredWithTime: 0,
                onTimeDelivered: 0,
            };
            current.totalShipments += Number(item.totalShipments || 0);
            current.delivered += Number(item.delivered || 0);
            current.rto += Number(item.rto || 0);
            current.ndr += Number(item.ndr || 0);
            current.damaged += Number(item.damaged || 0);
            current.lost += Number(item.lost || 0);
            current.totalCost += Number(item.totalCost || 0);
            current.totalDeliveryHours += Number(item.totalDeliveryHours || 0);
            current.deliveredWithTime += Number(item.deliveredWithTime || 0);
            current.onTimeDelivered += Number(item.onTimeDelivered || 0);
            courierAggregate.set(key, current);
        });

        const dedupedCouriers = Array.from(courierAggregate.entries()).map(([key, item]) => {
            const totalShipments = item.totalShipments || 0;
            const deliveryRate = totalShipments > 0 ? (item.delivered / totalShipments) * 100 : 0;
            const rtoRate = totalShipments > 0 ? (item.rto / totalShipments) * 100 : 0;
            const ndrRate = totalShipments > 0 ? (item.ndr / totalShipments) * 100 : 0;
            const rawAvgHours = item.deliveredWithTime > 0
                ? item.totalDeliveryHours / item.deliveredWithTime
                : (performanceMap.get(key)?.avgDeliveryDays || 0) * 24;
            const avgDeliveryTime = Math.max(0, rawAvgHours);
            const onTimeDelivery = item.delivered > 0 ? (item.onTimeDelivered / item.delivered) * 100 : 0;
            const avgCost = totalShipments > 0 ? item.totalCost / totalShipments : 0;

            return {
                courierId: toCarrierId(key),
                courierName: toCarrierLabel(key),
                totalShipments,
                successRate: round(deliveryRate, 1),
                avgDeliveryTime: round(avgDeliveryTime, 1),
                rtoRate: round(rtoRate, 1),
                ndrRate: round(ndrRate, 1),
                weightDisputes: 0,
                avgCost: round(avgCost, 2),
                codRemittanceTime: round(codHealth.averageRemittanceTime || 0, 1),
                onTimeDelivery: round(onTimeDelivery, 1),
                damagedShipments: item.damaged || 0,
                lostShipments: item.lost || 0,
            };
        }).sort((a, b) => b.totalShipments - a.totalShipments);

        const byScore = dedupedCouriers
            .map((courier) => {
                const score =
                    courier.successRate * 0.35 +
                    courier.onTimeDelivery * 0.25 +
                    (100 - courier.rtoRate) * 0.2 +
                    (100 - courier.ndrRate) * 0.1 +
                    Math.max(0, 100 - courier.avgCost) * 0.1;
                return { ...courier, score };
            })
            .sort((a, b) => b.score - a.score);

        const bestPerformance = byScore[0];
        const bestCost = [...dedupedCouriers].sort((a, b) => a.avgCost - b.avgCost)[0];
        const bestSpeed = [...dedupedCouriers].sort((a, b) => a.avgDeliveryTime - b.avgDeliveryTime)[0];

        return {
            couriers: dedupedCouriers,
            dateRange: {
                startDate: dateRange.start.toISOString(),
                endDate: dateRange.end.toISOString(),
            },
            recommendation: bestPerformance ? {
                bestPerformance: bestPerformance.courierId,
                bestCost: bestCost?.courierId || bestPerformance.courierId,
                bestSpeed: bestSpeed?.courierId || bestPerformance.courierId,
                overall: bestPerformance.courierId,
                reasoning: `${bestPerformance.courierName} leads on delivery reliability and overall weighted performance for this period.`,
            } : undefined,
        };
    }

    static async getSLAPerformance(companyId: string, filters?: SellerAnalyticsFilters) {
        const dateRange = this.resolveDateRange(filters);
        const companyObjectId = new mongoose.Types.ObjectId(companyId);

        const [pickupStats, deliveryStats, ndrStats, codHealth, courierData, zoneData, timeSeries] = await Promise.all([
            Shipment.aggregate([
                {
                    $match: {
                        companyId: companyObjectId,
                        isDeleted: false,
                        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        picked: { $sum: { $cond: [{ $ne: ['$pickupDetails.pickupDate', null] }, 1, 0] } },
                        onTimePickup: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $ne: ['$pickupDetails.pickupDate', null] },
                                            {
                                                $lte: [
                                                    { $divide: [{ $subtract: ['$pickupDetails.pickupDate', '$createdAt'] }, 1000 * 60 * 60] },
                                                    24,
                                                ],
                                            },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                    },
                },
            ]),
            Shipment.aggregate([
                {
                    $match: {
                        companyId: companyObjectId,
                        isDeleted: false,
                        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
                    },
                },
                {
                    $group: {
                        _id: null,
                        delivered: { $sum: { $cond: [{ $eq: ['$currentStatus', 'delivered'] }, 1, 0] } },
                        onTime: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ['$currentStatus', 'delivered'] },
                                            { $ne: ['$actualDelivery', null] },
                                            { $ne: ['$estimatedDelivery', null] },
                                            { $lte: ['$actualDelivery', '$estimatedDelivery'] },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                    },
                },
            ]),
            NDRAnalyticsService.getNDRStats(companyId, dateRange),
            CODAnalyticsService.getHealthMetrics(companyId, dateRange.start, dateRange.end),
            Shipment.aggregate([
                {
                    $match: {
                        companyId: companyObjectId,
                        isDeleted: false,
                        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
                    },
                },
                {
                    $group: {
                        _id: {
                            $toLower: {
                                $trim: {
                                    input: { $ifNull: ['$carrier', 'unknown'] },
                                },
                            },
                        },
                        total: { $sum: 1 },
                        picked: { $sum: { $cond: [{ $ne: ['$pickupDetails.pickupDate', null] }, 1, 0] } },
                        onTimePickup: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $ne: ['$pickupDetails.pickupDate', null] },
                                            {
                                                $lte: [
                                                    { $divide: [{ $subtract: ['$pickupDetails.pickupDate', '$createdAt'] }, 1000 * 60 * 60] },
                                                    24,
                                                ],
                                            },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        delivered: { $sum: { $cond: [{ $eq: ['$currentStatus', 'delivered'] }, 1, 0] } },
                        onTimeDelivery: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ['$currentStatus', 'delivered'] },
                                            { $ne: ['$actualDelivery', null] },
                                            { $ne: ['$estimatedDelivery', null] },
                                            { $lte: ['$actualDelivery', '$estimatedDelivery'] },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                    },
                },
            ]),
            Shipment.aggregate([
                {
                    $match: {
                        companyId: companyObjectId,
                        isDeleted: false,
                        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
                    },
                },
                {
                    $group: {
                        _id: { $ifNull: ['$deliveryDetails.address.state', 'Unknown'] },
                        total: { $sum: 1 },
                        delivered: { $sum: { $cond: [{ $eq: ['$currentStatus', 'delivered'] }, 1, 0] } },
                        onTimeDelivery: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ['$currentStatus', 'delivered'] },
                                            { $ne: ['$actualDelivery', null] },
                                            { $ne: ['$estimatedDelivery', null] },
                                            { $lte: ['$actualDelivery', '$estimatedDelivery'] },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        totalDeliveryHours: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ['$currentStatus', 'delivered'] },
                                            { $ne: ['$actualDelivery', null] },
                                        ],
                                    },
                                    { $divide: [{ $subtract: ['$actualDelivery', '$createdAt'] }, 1000 * 60 * 60] },
                                    0,
                                ],
                            },
                        },
                    },
                },
            ]),
            Shipment.aggregate([
                {
                    $match: {
                        companyId: companyObjectId,
                        isDeleted: false,
                        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
                    },
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        total: { $sum: 1 },
                        picked: { $sum: { $cond: [{ $ne: ['$pickupDetails.pickupDate', null] }, 1, 0] } },
                        onTimePickup: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $ne: ['$pickupDetails.pickupDate', null] },
                                            {
                                                $lte: [
                                                    { $divide: [{ $subtract: ['$pickupDetails.pickupDate', '$createdAt'] }, 1000 * 60 * 60] },
                                                    24,
                                                ],
                                            },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        delivered: { $sum: { $cond: [{ $eq: ['$currentStatus', 'delivered'] }, 1, 0] } },
                        onTimeDelivery: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ['$currentStatus', 'delivered'] },
                                            { $ne: ['$actualDelivery', null] },
                                            { $ne: ['$estimatedDelivery', null] },
                                            { $lte: ['$actualDelivery', '$estimatedDelivery'] },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
        ]);

        const pickupTotal = pickupStats[0]?.picked || 0;
        const pickupOnTime = pickupStats[0]?.onTimePickup || 0;
        const pickupCompliance = pickupTotal > 0 ? (pickupOnTime / pickupTotal) * 100 : 0;

        const deliveredTotal = deliveryStats[0]?.delivered || 0;
        const deliveryOnTime = deliveryStats[0]?.onTime || 0;
        const deliveryCompliance = deliveredTotal > 0 ? (deliveryOnTime / deliveredTotal) * 100 : 0;

        const ndrResponseHours = ndrStats.avgResolutionTime || 0;
        const codSettlementDays = codHealth.averageRemittanceTime || 0;
        const hasNdrData = (ndrStats.total || 0) > 0;
        const hasCodData = (codHealth.totalOrders || 0) > 0;

        const overallCompliance = round(
            (
                pickupCompliance +
                deliveryCompliance +
                (hasNdrData ? Math.max(0, 100 - (ndrResponseHours / DEFAULT_NDR_RESPONSE_TARGET_HOURS) * 100) : 0) +
                (hasCodData ? Math.max(0, 100 - (codSettlementDays / DEFAULT_COD_SETTLEMENT_TARGET_DAYS) * 100) : 0)
            ) / 4,
            1
        );

        return {
            overall: {
                compliance: overallCompliance,
                status: buildStatus(overallCompliance, 90),
            },
            pickupSLA: {
                name: 'Pickup within 24 hours',
                description: 'Shipments picked within SLA window from order creation.',
                target: DEFAULT_PICKUP_SLA_TARGET,
                actual: round(pickupCompliance, 1),
                compliance: round((pickupCompliance / DEFAULT_PICKUP_SLA_TARGET) * 100, 1),
                status: buildStatus(pickupCompliance, DEFAULT_PICKUP_SLA_TARGET),
                trend: 'stable',
            },
            deliverySLA: {
                name: 'Delivery within promised date',
                description: 'Delivered shipments completed on or before EDD.',
                target: DEFAULT_DELIVERY_SLA_TARGET,
                actual: round(deliveryCompliance, 1),
                compliance: round((deliveryCompliance / DEFAULT_DELIVERY_SLA_TARGET) * 100, 1),
                status: buildStatus(deliveryCompliance, DEFAULT_DELIVERY_SLA_TARGET),
                trend: 'stable',
            },
            ndrResponseSLA: {
                name: 'NDR response turnaround',
                description: 'Average time to resolve NDR cases.',
                target: DEFAULT_NDR_RESPONSE_TARGET_HOURS,
                actual: round(ndrResponseHours, 1),
                compliance: hasNdrData
                    ? round(Math.max(0, (DEFAULT_NDR_RESPONSE_TARGET_HOURS / Math.max(ndrResponseHours || 1, 1)) * 100), 1)
                    : 0,
                status: hasNdrData
                    ? buildStatus(ndrResponseHours, DEFAULT_NDR_RESPONSE_TARGET_HOURS, true)
                    : 'warning',
                trend: 'stable',
            },
            codSettlementSLA: {
                name: 'COD settlement cycle',
                description: 'Average remittance turnaround for COD deliveries.',
                target: DEFAULT_COD_SETTLEMENT_TARGET_DAYS,
                actual: round(codSettlementDays, 1),
                compliance: hasCodData
                    ? round(Math.max(0, (DEFAULT_COD_SETTLEMENT_TARGET_DAYS / Math.max(codSettlementDays || 1, 1)) * 100), 1)
                    : 0,
                status: hasCodData
                    ? buildStatus(codSettlementDays, DEFAULT_COD_SETTLEMENT_TARGET_DAYS, true)
                    : 'warning',
                trend: 'stable',
            },
            byCourier: Array.from(
                courierData.reduce((map: Map<string, { total: number; picked: number; onTimePickup: number; delivered: number; onTimeDelivery: number }>, item: any) => {
                    const key = canonicalizeCarrierKey(item._id);
                    const current = map.get(key) || { total: 0, picked: 0, onTimePickup: 0, delivered: 0, onTimeDelivery: 0 };
                    current.total += Number(item.total || 0);
                    current.picked += Number(item.picked || 0);
                    current.onTimePickup += Number(item.onTimePickup || 0);
                    current.delivered += Number(item.delivered || 0);
                    current.onTimeDelivery += Number(item.onTimeDelivery || 0);
                    map.set(key, current);
                    return map;
                }, new Map<string, { total: number; picked: number; onTimePickup: number; delivered: number; onTimeDelivery: number }>())
            ).map(([key, item]) => {
                const pickup = item.picked > 0 ? (item.onTimePickup / item.picked) * 100 : 0;
                const delivery = item.delivered > 0 ? (item.onTimeDelivery / item.delivered) * 100 : 0;
                return {
                    courierId: toCarrierId(key),
                    courierName: toCarrierLabel(key),
                    compliance: round((pickup + delivery) / 2, 1),
                    pickupSLA: round(pickup, 1),
                    deliverySLA: round(delivery, 1),
                };
            }),
            byZone: zoneData.map((item: any) => {
                const compliance = item.delivered > 0 ? (item.onTimeDelivery / item.delivered) * 100 : 0;
                return {
                    zoneId: String(item._id || 'unknown').toLowerCase().replace(/\s+/g, '_'),
                    zoneName: item._id || 'Unknown',
                    compliance: round(compliance, 1),
                    avgDeliveryTime: item.delivered > 0 ? round(item.totalDeliveryHours / item.delivered, 1) : 0,
                };
            }),
            timeSeries: timeSeries.map((item: any) => ({
                date: item._id,
                compliance: item.total > 0 ? round(((item.onTimePickup + item.onTimeDelivery) / Math.max(item.total, 1)) * 100, 1) : 0,
                pickupOnTime: item.picked > 0 ? round((item.onTimePickup / item.picked) * 100, 1) : 0,
                deliveryOnTime: item.delivered > 0 ? round((item.onTimeDelivery / item.delivered) * 100, 1) : 0,
            })),
            targets: {
                pickup: DEFAULT_PICKUP_SLA_TARGET,
                delivery: DEFAULT_DELIVERY_SLA_TARGET,
                ndrResponseHours: DEFAULT_NDR_RESPONSE_TARGET_HOURS,
                codSettlementDays: DEFAULT_COD_SETTLEMENT_TARGET_DAYS,
            },
        };
    }
}
