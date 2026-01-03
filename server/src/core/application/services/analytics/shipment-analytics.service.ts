/**
 * Shipment Analytics Service
 * 
 * Provides shipment statistics, courier performance, and delivery analysis.
 */

import { Shipment } from '../../../../infrastructure/database/mongoose/models';
import AnalyticsService, { DateRange } from './analytics.service';
import logger from '../../../../shared/logger/winston.logger';

export interface ShipmentStats {
    total: number;
    delivered: number;
    inTransit: number;
    failed: number;
    rto: number;
    deliveryRate: number;
}

export interface CourierPerformance {
    carrier: string;
    shipments: number;
    delivered: number;
    avgDeliveryDays: number;
    deliveryRate: number;
}

export interface DeliveryTimeBreakdown {
    under24h: number;
    days1to3: number;
    days3to7: number;
    over7days: number;
}

export default class ShipmentAnalyticsService {
    /**
     * Get overall shipment statistics
     */
    static async getShipmentStats(companyId: string, dateRange?: DateRange): Promise<ShipmentStats> {
        try {
            const matchStage = AnalyticsService.buildMatchStage(companyId, dateRange, { isDeleted: false });

            const results = await Shipment.aggregate([
                matchStage,
                {
                    $group: {
                        _id: '$currentStatus',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const statusCounts: Record<string, number> = {};
            let total = 0;
            results.forEach(r => {
                statusCounts[r._id] = r.count;
                total += r.count;
            });

            const delivered = statusCounts['delivered'] || 0;
            const attempted = delivered + (statusCounts['failed'] || 0) + (statusCounts['rto'] || 0);

            return {
                total,
                delivered,
                inTransit: statusCounts['in_transit'] || statusCounts['shipped'] || 0,
                failed: statusCounts['failed'] || 0,
                rto: statusCounts['rto'] || 0,
                deliveryRate: attempted > 0 ? Math.round((delivered / attempted) * 100 * 10) / 10 : 0
            };
        } catch (error) {
            logger.error('Error getting shipment stats:', error);
            throw error;
        }
    }

    /**
     * Get performance metrics by courier
     */
    static async getCourierPerformance(companyId: string, dateRange?: DateRange): Promise<CourierPerformance[]> {
        try {
            const matchStage = AnalyticsService.buildMatchStage(companyId, dateRange, { isDeleted: false });

            const results = await Shipment.aggregate([
                matchStage,
                {
                    $group: {
                        _id: '$carrier',
                        shipments: { $sum: 1 },
                        delivered: {
                            $sum: { $cond: [{ $eq: ['$currentStatus', 'delivered'] }, 1, 0] }
                        },
                        totalDeliveryDays: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ['$currentStatus', 'delivered'] },
                                            { $ne: ['$actualDelivery', null] }
                                        ]
                                    },
                                    {
                                        $divide: [
                                            { $subtract: ['$actualDelivery', '$createdAt'] },
                                            1000 * 60 * 60 * 24
                                        ]
                                    },
                                    0
                                ]
                            }
                        },
                        deliveredCount: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ['$currentStatus', 'delivered'] },
                                            { $ne: ['$actualDelivery', null] }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                },
                { $sort: { shipments: -1 } },
                {
                    $project: {
                        _id: 0,
                        carrier: '$_id',
                        shipments: 1,
                        delivered: 1,
                        avgDeliveryDays: {
                            $cond: [
                                { $gt: ['$deliveredCount', 0] },
                                { $round: [{ $divide: ['$totalDeliveryDays', '$deliveredCount'] }, 1] },
                                0
                            ]
                        },
                        deliveryRate: {
                            $cond: [
                                { $gt: ['$shipments', 0] },
                                { $round: [{ $multiply: [{ $divide: ['$delivered', '$shipments'] }, 100] }, 1] },
                                0
                            ]
                        }
                    }
                }
            ]);

            return results;
        } catch (error) {
            logger.error('Error getting courier performance:', error);
            throw error;
        }
    }

    /**
     * Get delivery time breakdown
     */
    static async getDeliveryTimeAnalysis(companyId: string, dateRange?: DateRange): Promise<DeliveryTimeBreakdown> {
        try {
            const matchStage = AnalyticsService.buildMatchStage(companyId, dateRange, {
                isDeleted: false,
                currentStatus: 'delivered',
                actualDelivery: { $exists: true }
            });

            const results = await Shipment.aggregate([
                matchStage,
                {
                    $project: {
                        deliveryDays: {
                            $divide: [
                                { $subtract: ['$actualDelivery', '$createdAt'] },
                                1000 * 60 * 60 * 24
                            ]
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        under24h: { $sum: { $cond: [{ $lt: ['$deliveryDays', 1] }, 1, 0] } },
                        days1to3: { $sum: { $cond: [{ $and: [{ $gte: ['$deliveryDays', 1] }, { $lt: ['$deliveryDays', 3] }] }, 1, 0] } },
                        days3to7: { $sum: { $cond: [{ $and: [{ $gte: ['$deliveryDays', 3] }, { $lt: ['$deliveryDays', 7] }] }, 1, 0] } },
                        over7days: { $sum: { $cond: [{ $gte: ['$deliveryDays', 7] }, 1, 0] } }
                    }
                }
            ]);

            return results[0] || { under24h: 0, days1to3: 0, days3to7: 0, over7days: 0 };
        } catch (error) {
            logger.error('Error getting delivery time analysis:', error);
            throw error;
        }
    }
}
