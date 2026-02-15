import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import ReturnService from '../../../../core/application/services/logistics/return.service';
import ReturnOrder from '../../../../infrastructure/database/mongoose/models/logistics/returns/return-order.model';
import { NotFoundError, ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { guardChecks } from '../../../../shared/helpers/controller.helpers';
import logger from '../../../../shared/logger/winston.logger';
import {
calculatePagination,
sendPaginated,
sendSuccess
} from '../../../../shared/utils/responseHelper';
import { createAuditLog } from '../../middleware/system/audit-log.middleware';

/**
 * Admin Return Controller
 * 
 * Admin-specific endpoints for managing returns across all companies.
 * Separated from the regular ReturnController to avoid complex permission checks.
 */

/**
 * GET /api/v1/admin/returns
 * List all returns (Admin View - can see ALL companies)
 */
export const getAllReturns = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
void auth;

        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
        const skip = (page - 1) * limit;

        const filter: any = { isDeleted: false };

        // Admin filters
        if (req.query.companyId) {
            filter.companyId = req.query.companyId;
        }

        if (req.query.status) {
            filter.status = req.query.status;
        }

        if (req.query.returnReason) {
            filter.returnReason = req.query.returnReason;
        }

        if (req.query.search) {
            filter.$or = [
                { returnId: { $regex: req.query.search, $options: 'i' } },
                { orderId: { $regex: req.query.search, $options: 'i' } },
            ];
        }

        // Populate company and customer details for admin view
        const [returns, total] = await Promise.all([
            ReturnOrder.find(filter)
                .populate('companyId', 'name email phone')
                .populate('customerId', 'name email phone')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            ReturnOrder.countDocuments(filter),
        ]);

        const formattedReturns = returns.map(returnOrder => ({
            _id: returnOrder._id,
            returnId: returnOrder.returnId,
            orderId: returnOrder.orderId,
            shipmentId: returnOrder.shipmentId,
            status: returnOrder.status,
            returnReason: returnOrder.returnReason,
            refundAmount: returnOrder.refundAmount,
            customerName: (returnOrder as any).customerId?.name || 'Unknown',
            companyName: (returnOrder as any).companyId?.name || 'Unknown',
            reason: returnOrder.returnReasonText || returnOrder.returnReason,
            pickup: {
                status: returnOrder.pickup?.status,
                scheduledDate: returnOrder.pickup?.scheduledDate,
                awb: returnOrder.pickup?.awb,
            },
            qc: {
                status: returnOrder.qc?.status,
                result: returnOrder.qc?.result,
            },
            refund: {
                status: returnOrder.refund?.status,
            },
            sla: {
                isBreached: returnOrder.sla?.isBreached,
            },
            createdAt: returnOrder.createdAt,
            updatedAt: returnOrder.updatedAt,
        }));

        const pagination = calculatePagination(total, page, limit);
        sendPaginated(res, formattedReturns, pagination, 'Returns retrieved successfully');
    } catch (error) {
        logger.error('Error fetching admin returns:', error);
        next(error);
    }
};

/**
 * GET /api/v1/admin/returns/stats
 * Get return metrics for admin dashboard
 */
export const getReturnStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
void auth;

        const filter: any = { isDeleted: false };

        // Optional company filter
        if (req.query.companyId) {
            filter.companyId = req.query.companyId;
        }

        const [total, requested, qcPending, totalRefundAmount] = await Promise.all([
            ReturnOrder.countDocuments(filter),
            ReturnOrder.countDocuments({ ...filter, status: 'requested' }),
            ReturnOrder.countDocuments({ ...filter, 'qc.status': 'pending' }),
            ReturnOrder.aggregate([
                { $match: filter },
                { $group: { _id: null, total: { $sum: '$refundAmount' } } }
            ]).then(result => result[0]?.total || 0),
        ]);

        sendSuccess(res, {
            total,
            requested,
            qcPending,
            totalRefundAmount,
        }, 'Return statistics retrieved successfully');
    } catch (error) {
        logger.error('Error fetching return stats:', error);
        next(error);
    }
};

/**
 * GET /api/v1/admin/returns/:returnId
 * Get detailed return information (Admin can view ANY return)
 */
export const getReturnById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
void auth;

        const { returnId } = req.params;

        // Try to find by returnId string or MongoDB _id
        const query = mongoose.Types.ObjectId.isValid(returnId)
            ? { $or: [{ returnId }, { _id: returnId }], isDeleted: false }
            : { returnId, isDeleted: false };

        const returnOrder = await ReturnOrder.findOne(query)
            .populate('companyId', 'name email phone')
            .populate('customerId', 'name email phone')
            .lean();

        if (!returnOrder) {
            throw new NotFoundError('Return', ErrorCode.RES_ORDER_NOT_FOUND);
        }

        sendSuccess(res, { return: returnOrder }, 'Return retrieved successfully');
    } catch (error) {
        logger.error('Error fetching return:', error);
        next(error);
    }
};

/**
 * PATCH /api/v1/admin/returns/:returnId/status
 * Update return status (Admin override)
 */
export const updateReturnStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });

        const { returnId } = req.params;
        const { status, notes } = req.body;

        if (!status) {
            throw new ValidationError('Status is required');
        }

        const query = mongoose.Types.ObjectId.isValid(returnId)
            ? { $or: [{ returnId }, { _id: returnId }], isDeleted: false }
            : { returnId, isDeleted: false };

        const returnOrder = await ReturnOrder.findOne(query);

        if (!returnOrder) {
            throw new NotFoundError('Return', ErrorCode.RES_ORDER_NOT_FOUND);
        }

        // Update status
        returnOrder.status = status;

        // Add to timeline
        returnOrder.timeline.push({
            status,
            timestamp: new Date(),
            actor: auth.userId as any,
            action: `Admin updated status to ${status}`,
            notes: notes || `Status changed by admin`,
        });

        await returnOrder.save();

        await createAuditLog(
            auth.userId,
            auth.companyId || 'admin',
            'update',
            'return',
            (returnOrder._id as any).toString(),
            { message: `Admin updated return status to ${status}` },
            req
        );

        sendSuccess(res, { return: returnOrder.toObject() }, 'Return status updated successfully');
    } catch (error) {
        logger.error('Error updating return status:', error);
        next(error);
    }
};

/**
 * POST /api/v1/admin/returns/:returnId/refund
 * Manually trigger refund processing (Admin)
 */
export const processReturnRefund = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });

        const { returnId } = req.params;

        const returnOrder = await ReturnService.processRefund(returnId);

        await createAuditLog(
            auth.userId,
            auth.companyId || 'admin',
            'update',
            'return',
            (returnOrder._id as any).toString(),
            { message: 'Admin triggered refund processing' },
            req
        );

        sendSuccess(res, {
            returnId: returnOrder.returnId,
            status: returnOrder.status,
            refund: {
                status: returnOrder.refund.status,
                transactionId: returnOrder.refund.transactionId,
                amount: returnOrder.calculateActualRefund(),
                completedAt: returnOrder.refund.completedAt,
            },
        }, 'Refund processed successfully');
    } catch (error) {
        logger.error('Error processing refund:', error);
        next(error);
    }
};

export default {
    getAllReturns,
    getReturnStats,
    getReturnById,
    updateReturnStatus,
    processReturnRefund,
};
