import mongoose from 'mongoose';
import Shipment from '../../../../infrastructure/database/mongoose/models/logistics/shipping/core/shipment.model';
import logger from '../../../../shared/logger/winston.logger';

export interface RateCardUsageStats {
    totalShipments: number;
    totalRevenue: number;
    averageCost: number;
    zoneDistribution: Record<string, number>;
    topCarriers: Array<{ carrier: string; count: number }>;
    topCustomers: Array<{ customerId: string; count: number; revenue: number }>;
}

export class RateCardAnalyticsService {
    private static instance: RateCardAnalyticsService;

    private constructor() {}

    public static getInstance(): RateCardAnalyticsService {
        if (!RateCardAnalyticsService.instance) {
            RateCardAnalyticsService.instance = new RateCardAnalyticsService();
        }
        return RateCardAnalyticsService.instance;
    }

    async getRateCardUsageStats(
        rateCardId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<RateCardUsageStats> {
        try {
            const dateFilter: any = {};
            if (startDate) dateFilter.$gte = startDate;
            if (endDate) dateFilter.$lte = endDate;

            const matchStage: any = {
                'pricingDetails.rateCardId': new mongoose.Types.ObjectId(rateCardId),
                isDeleted: false
            };

            if (Object.keys(dateFilter).length > 0) {
                matchStage.createdAt = dateFilter;
            }

            // Aggregate analytics
            const [stats] = await Shipment.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: null,
                        totalShipments: { $sum: 1 },
                        totalRevenue: { $sum: '$pricingDetails.totalPrice' },
                        avgCost: { $avg: '$pricingDetails.totalPrice' },
                        zones: { $push: '$pricingDetails.zone' },
                        carriers: { $push: '$carrier' }
                    }
                }
            ]);

            if (!stats) {
                return {
                    totalShipments: 0,
                    totalRevenue: 0,
                    averageCost: 0,
                    zoneDistribution: {},
                    topCarriers: [],
                    topCustomers: []
                };
            }

            // Calculate zone distribution
            const zoneDistribution: Record<string, number> = {};
            stats.zones.forEach((zone: string) => {
                zoneDistribution[zone] = (zoneDistribution[zone] || 0) + 1;
            });

            // Calculate top carriers
            const carrierCounts: Record<string, number> = {};
            stats.carriers.forEach((carrier: string) => {
                carrierCounts[carrier] = (carrierCounts[carrier] || 0) + 1;
            });

            const topCarriers = Object.entries(carrierCounts)
                .map(([carrier, count]) => ({ carrier, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            return {
                totalShipments: stats.totalShipments,
                totalRevenue: Math.round(stats.totalRevenue * 100) / 100,
                averageCost: Math.round(stats.avgCost * 100) / 100,
                zoneDistribution,
                topCarriers,
                topCustomers: [] // TODO: Implement customer tracking
            };
        } catch (error) {
            logger.error('[RateCardAnalytics] Failed to get usage stats:', error);
            throw error;
        }
    }

    async getRevenueTimeSeries(
        rateCardId: string,
        startDate: Date,
        endDate: Date,
        granularity: 'day' | 'week' | 'month' = 'day'
    ): Promise<Array<{ date: string; revenue: number; count: number }>> {
        try {
            const groupByFormat = granularity === 'day'
                ? '%Y-%m-%d'
                : granularity === 'week'
                    ? '%Y-%U'
                    : '%Y-%m';

            const timeSeries = await Shipment.aggregate([
                {
                    $match: {
                        'pricingDetails.rateCardId': new mongoose.Types.ObjectId(rateCardId),
                        createdAt: { $gte: startDate, $lte: endDate },
                        isDeleted: false
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: groupByFormat, date: '$createdAt' } },
                        revenue: { $sum: '$pricingDetails.totalPrice' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]);

            return timeSeries.map(item => ({
                date: item._id,
                revenue: Math.round(item.revenue * 100) / 100,
                count: item.count
            }));
        } catch (error) {
            logger.error('[RateCardAnalytics] Failed to get revenue time series:', error);
            throw error;
        }
    }
}

export default RateCardAnalyticsService.getInstance();
