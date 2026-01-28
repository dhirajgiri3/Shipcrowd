
import { Request, Response, NextFunction } from 'express';
import { Order, Shipment } from '../../../../infrastructure/database/mongoose/models';
import Dispute from '../../../../infrastructure/database/mongoose/models/crm/disputes/dispute.model';
import { sendSuccess } from '../../../../shared/utils/responseHelper';
import mongoose from 'mongoose';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Seller Health Controller
 * Aggregates metrics to show seller performance Scorecard
 */
export const getSellerHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const companyId = req.user?.companyId;

        if (!companyId) {
            sendSuccess(res, { healthScore: 0, metrics: {} }, 'No company ID found');
            return;
        }

        const cid = new mongoose.Types.ObjectId(companyId);

        // 1. Total Orders & Fulfillment Rate
        const totalOrders = await Order.countDocuments({ company: cid });
        const fulfilledOrders = await Order.countDocuments({ company: cid, status: 'fulfilled' });

        // 2. NDR Ratio (RTO / Total Shipments)
        const totalShipments = await Shipment.countDocuments({ company: cid });
        const rtoShipments = await Shipment.countDocuments({ company: cid, status: 'rto' }); // Check status enum

        // 3. Dispute Rate
        const totalDisputes = await Dispute.countDocuments({ company: cid });
        const unresolvedDisputes = await Dispute.countDocuments({
            company: cid,
            status: { $in: ['open', 'investigation', 'decision'] }
        });

        // 4. Calculate Health Score (Simple Algorithm)
        // Base 100
        // -5 per 1% RTO > 10%
        // -10 per unresolved dispute > 5

        let score = 100;

        // RTO Penalty
        const rtoRate = totalShipments > 0 ? (rtoShipments / totalShipments) * 100 : 0;
        if (rtoRate > 10) {
            score -= (rtoRate - 10) * 2;
        }

        // Dispute Penalty
        if (unresolvedDisputes > 5) {
            score -= (unresolvedDisputes - 5) * 5;
        }

        score = Math.max(0, Math.min(100, Math.round(score)));

        const healthData = {
            score,
            status: score > 80 ? 'Excellent' : score > 50 ? 'Average' : 'Critical',
            metrics: {
                fulfillmentRate: totalOrders > 0 ? ((fulfilledOrders / totalOrders) * 100).toFixed(2) : '0.00',
                rtoRate: rtoRate.toFixed(2),
                disputeRate: totalOrders > 0 ? ((totalDisputes / totalOrders) * 100).toFixed(2) : '0.00',
                openDisputes: unresolvedDisputes,
                totalOrders,
                totalShipments
            }
        };

        sendSuccess(res, healthData, 'Seller health metrics retrieved successfully');
    } catch (error) {
        logger.error('Error calculating seller health:', error);
        next(error);
    }
};

export default {
    getSellerHealth
};
