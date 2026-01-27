import { Request, Response, NextFunction } from 'express';
import { Order, Shipment } from '../../../../infrastructure/database/mongoose/models';
import { guardChecks } from '../../../../shared/helpers/controller.helpers';
import { sendSuccess } from '../../../../shared/utils/responseHelper';
import logger from '../../../../shared/logger/winston.logger';
import mongoose from 'mongoose';

/**
 * Seller Health Controller
 * Aggregates performance metrics for the seller dashboard/health score
 */
export const getSellerHealth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req);
        const companyObjectId = new mongoose.Types.ObjectId(auth.companyId);

        // Date range: Last 30 days by default
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        // Parallel aggregation for performance
        const [orderMetrics, shipmentMetrics] = await Promise.all([
            // 1. Order Metrics (Revenue, Volume, Growth)
            Order.aggregate([
                {
                    $match: {
                        companyId: companyObjectId,
                        isDeleted: false,
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        revenue: { $sum: '$totals.total' },
                        orderVolume: { $sum: 1 }
                    }
                }
            ]),

            // 2. Shipment Metrics (RTO, NDR, Delivery Time)
            Shipment.aggregate([
                {
                    $match: {
                        companyId: companyObjectId,
                        isDeleted: false,
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalShipments: { $sum: 1 },
                        rtoCount: {
                            $sum: {
                                $cond: [{ $in: ['$currentStatus', ['rto', 'rto_initiated', 'rto_delivered']] }, 1, 0]
                            }
                        },
                        ndrCount: {
                            $sum: {
                                $cond: [{ $gt: [{ $size: { $ifNull: ['$ndrDetails', []] } }, 0] }, 1, 0]
                            }
                        },
                        // Calculate average delivery time for delivered items
                        totalDeliveryTime: {
                            $sum: {
                                $cond: [
                                    { $and: [{ $eq: ['$currentStatus', 'delivered'] }, { $ifNull: ['$actualDelivery', false] }] },
                                    { $subtract: ['$actualDelivery', '$createdAt'] },
                                    0
                                ]
                            }
                        },
                        deliveredCount: {
                            $sum: {
                                $cond: [{ $eq: ['$currentStatus', 'delivered'] }, 1, 0]
                            }
                        }
                    }
                }
            ])
        ]);

        const orders = orderMetrics[0] || { revenue: 0, orderVolume: 0 };
        const shipments = shipmentMetrics[0] || { totalShipments: 0, rtoCount: 0, ndrCount: 0, totalDeliveryTime: 0, deliveredCount: 0 };

        // Calculate RTO Rate
        const rtoRate = shipments.totalShipments > 0
            ? (shipments.rtoCount / shipments.totalShipments) * 100
            : 0;

        // Calculate NDR Rate
        const ndrRate = shipments.totalShipments > 0
            ? (shipments.ndrCount / shipments.totalShipments) * 100
            : 0;

        // Calculate Avg Delivery Time (Days)
        const avgDeliveryTime = shipments.deliveredCount > 0
            ? (shipments.totalDeliveryTime / shipments.deliveredCount) / (1000 * 60 * 60 * 24)
            : 0;

        // Mock Customer Satisfaction (CSAT) for now, or implement logic based on feedback if available
        const customerSatisfaction = 4.5;

        // Mock Growth metrics for now (requires comparing with previous period)
        const revenueGrowth = 10; // 10% growth
        const volumeGrowth = 5;   // 5% growth

        sendSuccess(res, {
            revenue: orders.revenue,
            revenueGrowth,
            orderVolume: orders.orderVolume,
            volumeGrowth,
            rtoRate: parseFloat(rtoRate.toFixed(2)),
            ndrRate: parseFloat(ndrRate.toFixed(2)),
            avgDeliveryTime: parseFloat(avgDeliveryTime.toFixed(1)),
            customerSatisfaction
        }, 'Seller health metrics retrieved successfully');

    } catch (error) {
        logger.error('Error fetching seller health:', error);
        next(error);
    }
};

export default {
    getSellerHealth
};
