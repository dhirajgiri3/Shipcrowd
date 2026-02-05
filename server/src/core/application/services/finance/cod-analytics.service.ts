import mongoose from 'mongoose';
import Shipment from '../../../../infrastructure/database/mongoose/models/logistics/shipping/core/shipment.model';
import CODDiscrepancy from '../../../../infrastructure/database/mongoose/models/finance/cod-discrepancy.model';
import logger from '../../../../shared/logger/winston.logger';

/**
 * COD Analytics Service
 * 
 * Provides financial intelligence:
 * 1. Cash Flow Forecasting (Predicting incoming remittances)
 * 2. Health Metrics (RTO rates, Dispute rates, Collection efficiency)
 * 3. Carrier Performance (Benchmark couriers against each other)
 */
export class CODAnalyticsService {

    /**
     * Forecast Cash Flow for next N days
     * Based on shipments that are 'shipped' or 'out_for_delivery' or 'delivered' but not remitted
     */
    static async forecastCashFlow(companyId: string, days: number = 7): Promise<{
        daily: Array<{ date: string; expectedCOD: number; riskAdjusted: number; count: number }>;
        total: { expectedCOD: number; riskAdjusted: number; count: number };
    }> {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + days);

        // Pipeline:
        // 1. Match active COD shipments not yet remitted
        // 2. Project expected delivery date (EDD) or guess based on status
        // 3. Group by date
        // 4. Apply risk adjustment (reduce by avg RTO rate)

        // For simplicity, we assume:
        // - 'shipped' -> +3 days
        // - 'out_for_delivery' -> +0 days (today)
        // - 'delivered' (not remitted) -> +1 day (or next payout cycle)

        const matchStage = {
            companyId: new mongoose.Types.ObjectId(companyId),
            'paymentDetails.type': 'cod',
            'paymentDetails.collectionStatus': { $nin: ['remitted', 'reconciled'] }, // Not yet money in bank
            currentStatus: { $in: ['shipped', 'out_for_delivery', 'delivered'] }
        };

        const aggregation = await Shipment.aggregate([
            { $match: matchStage },
            {
                $project: {
                    codAmount: { $ifNull: ['$paymentDetails.codAmount', 0] },
                    status: '$currentStatus',
                    rtoRisk: { $ifNull: ['$paymentDetails.fraud.riskScore', 0.1] }, // Default 10% risk if no score
                    expectedDate: {
                        $switch: {
                            branches: [
                                { case: { $eq: ['$currentStatus', 'delivered'] }, then: new Date() }, // Ready for remittance
                                { case: { $eq: ['$currentStatus', 'out_for_delivery'] }, then: new Date() },
                                { case: { $eq: ['$currentStatus', 'shipped'] }, then: { $add: [new Date(), 3 * 24 * 60 * 60 * 1000] } } // +3 days
                            ],
                            default: { $add: [new Date(), 5 * 24 * 60 * 60 * 1000] }
                        }
                    }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$expectedDate' } },
                    totalAmount: { $sum: '$codAmount' },
                    riskAdjustedAmount: { $sum: { $multiply: ['$codAmount', { $subtract: [1, '$rtoRisk'] }] } }, // Amount * (1 - Risk)
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const daily = aggregation.map(day => ({
            date: day._id,
            expectedCOD: Math.round(day.totalAmount),
            riskAdjusted: Math.round(day.riskAdjustedAmount),
            count: day.count
        }));

        const total = daily.reduce((acc, day) => ({
            expectedCOD: acc.expectedCOD + day.expectedCOD,
            riskAdjusted: acc.riskAdjusted + day.riskAdjusted,
            count: acc.count + day.count
        }), { expectedCOD: 0, riskAdjusted: 0, count: 0 });

        return { daily, total };
    }

    /**
     * Get Health Metrics (Period-based)
     * RTO Rate, Dispute Rate, Collection Efficiency
     */
    static async getHealthMetrics(companyId: string, startDate: Date, endDate: Date) {
        const query = {
            companyId: new mongoose.Types.ObjectId(companyId),
            createdAt: { $gte: startDate, $lte: endDate }
        };

        // 1. Total COD Orders
        const totalOrders = await Shipment.countDocuments({ ...query, 'paymentDetails.type': 'cod' });

        if (totalOrders === 0) {
            return {
                totalOrders: 0, rtoRate: 0, disputeRate: 0, collectionRate: 0, averageRemittanceTime: 0
            };
        }

        // 2. RTO Orders
        const rtoOrders = await Shipment.countDocuments({
            ...query,
            'paymentDetails.type': 'cod',
            currentStatus: 'rto'
        });

        // 3. Disputed Shipments (using discrepancy count or collectionStatus)
        const disputedOrders = await CODDiscrepancy.countDocuments({
            companyId: new mongoose.Types.ObjectId(companyId),
            createdAt: { $gte: startDate, $lte: endDate }
        });

        // 4. Delivered & Remitted
        const remittedOrders = await Shipment.find({
            ...query,
            'paymentDetails.collectionStatus': 'remitted'
        }, 'createdAt remittance.remittedAt');

        // 5. Avg Remittance Time
        let totalTime = 0;
        let timeCount = 0;
        remittedOrders.forEach((order: any) => {
            if (order.remittance?.remittedAt) {
                const diff = (new Date(order.remittance.remittedAt).getTime() - new Date(order.createdAt).getTime());
                totalTime += diff;
                timeCount++;
            }
        });

        const avgRemittanceTimeDays = timeCount > 0 ? (totalTime / timeCount) / (1000 * 60 * 60 * 24) : 0;

        return {
            totalOrders,
            rtoRate: parseFloat(((rtoOrders / totalOrders) * 100).toFixed(2)),
            disputeRate: parseFloat(((disputedOrders / totalOrders) * 100).toFixed(2)),
            collectionRate: parseFloat((((totalOrders - rtoOrders) / totalOrders) * 100).toFixed(2)), // Gross assumption for collections
            averageRemittanceTime: parseFloat(avgRemittanceTimeDays.toFixed(1))
        };
    }

    /**
     * Compare Carrier Performance
     * (Phase 10: Multi-Courier Intelligence)
     */
    static async carrierPerformance(companyId: string, days: number = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        return await Shipment.aggregate([
            {
                $match: {
                    companyId: new mongoose.Types.ObjectId(companyId),
                    'paymentDetails.type': 'cod',
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$carrier',
                    total: { $sum: 1 },
                    rtoCount: {
                        $sum: { $cond: [{ $eq: ['$currentStatus', 'rto'] }, 1, 0] }
                    },
                    deliveredCount: {
                        $sum: { $cond: [{ $eq: ['$currentStatus', 'delivered'] }, 1, 0] }
                    },
                    totalCOD: { $sum: '$paymentDetails.codAmount' },
                    collectedCOD: {
                        $sum: { $cond: [{ $eq: ['$paymentDetails.collectionStatus', 'remitted'] }, '$paymentDetails.codAmount', 0] }
                    }
                }
            },
            {
                $project: {
                    carrier: '$_id',
                    totalOrders: '$total',
                    rtoRate: { $multiply: [{ $divide: ['$rtoCount', '$total'] }, 100] },
                    deliveryRate: { $multiply: [{ $divide: ['$deliveredCount', '$total'] }, 100] },
                    collectionEfficiency: {
                        $cond: [
                            { $gt: ['$totalCOD', 0] },
                            { $multiply: [{ $divide: ['$collectedCOD', '$totalCOD'] }, 100] },
                            0
                        ]
                    }
                }
            },
            { $sort: { deliveryRate: -1 } }
        ]);
    }
}
