/**
 * Weight Disputes Controller
 * 
 * Handles HTTP requests for weight dispute management:
 * - List disputes with filters
 * - Get dispute details
 * - Submit seller evidence
 * - Resolve disputes (admin only)
 * - Get analytics (admin only)
 */

import { Request, Response, NextFunction } from 'express';
import WeightDispute from '../../../../infrastructure/database/mongoose/models/logistics/shipping/exceptions/weight-dispute.model';
import {
    WeightDisputeDetectionService,
    WeightDisputeResolutionService,
    WeightDisputeAnalyticsService,
} from '../../../../core/application/services/disputes';
import logger from '../../../../shared/logger/winston.logger';
import { createAuditLog } from '../../middleware/system/audit-log.middleware';
import {
    guardChecks,
    validateObjectId,
    parsePagination,
} from '../../../../shared/helpers/controller.helpers';
import {
    sendSuccess,
    sendError,
    sendValidationError,
    sendPaginated,
    calculatePagination,
} from '../../../../shared/utils/responseHelper';

/**
 * GET /api/v1/disputes/weight
 * List weight disputes with filters
 * 
 * Query params:
 * - status: pending | under_review | resolved
 * - startDate, endDate: Date range filter
 * - page, limit: Pagination
 */
export const listDisputes = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { page, limit, skip } = parsePagination(req.query as any);

        const filter: Record<string, any> = {
            companyId: auth.companyId,
            isDeleted: false,
        };

        // Status filter
        if (req.query.status) {
            filter.status = req.query.status;
        }

        // Date range filter
        if (req.query.startDate || req.query.endDate) {
            filter.createdAt = {};
            if (req.query.startDate) {
                filter.createdAt.$gte = new Date(req.query.startDate as string);
            }
            if (req.query.endDate) {
                filter.createdAt.$lte = new Date(req.query.endDate as string);
            }
        }

        // Search by dispute ID or shipment ID
        if (req.query.search) {
            filter.$or = [
                { disputeId: { $regex: req.query.search, $options: 'i' } },
            ];
        }

        const [disputes, total] = await Promise.all([
            WeightDispute.find(filter)
                .populate('shipmentId', 'trackingNumber carrier currentStatus')
                .populate('orderId', 'orderNumber')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            WeightDispute.countDocuments(filter),
        ]);

        const pagination = calculatePagination(total, page, limit);
        sendPaginated(res, disputes, pagination, 'Weight disputes retrieved successfully');
    } catch (error) {
        logger.error('Error listing weight disputes:', error);
        next(error);
    }
};

/**
 * GET /api/v1/disputes/weight/:disputeId
 * Get dispute details with full timeline
 */
export const getDisputeDetails = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { disputeId } = req.params;
        if (!validateObjectId(disputeId, res, 'dispute')) return;

        const dispute = await WeightDispute.findOne({
            _id: disputeId,
            companyId: auth.companyId,
            isDeleted: false,
        })
            .populate('shipmentId', 'trackingNumber carrier serviceType currentStatus packageDetails deliveryDetails')
            .populate('orderId', 'orderNumber customerInfo')
            .lean();

        if (!dispute) {
            sendError(res, 'Dispute not found', 404, 'DISPUTE_NOT_FOUND');
            return;
        }

        sendSuccess(res, { dispute }, 'Dispute details retrieved successfully');
    } catch (error) {
        logger.error('Error fetching dispute details:', error);
        next(error);
    }
};

/**
 * POST /api/v1/disputes/weight/:disputeId/submit
 * Seller submits evidence for dispute
 * 
 * Body:
 * - photos: string[] (S3/CloudFlare URLs)
 * - documents: string[] (S3/CloudFlare URLs)
 * - notes: string
 */
export const submitSellerEvidence = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { disputeId } = req.params;
        if (!validateObjectId(disputeId, res, 'dispute')) return;

        // Validation
        const { photos, documents, notes } = req.body;

        if (!photos && !documents && !notes) {
            sendValidationError(res, [
                {
                    code: 'VALIDATION_ERROR',
                    message: 'At least one of photos, documents, or notes is required',
                    field: 'evidence',
                },
            ]);
            return;
        }

        // Submit evidence via service
        const dispute = await WeightDisputeResolutionService.submitSellerResponse(
            disputeId,
            auth.companyId,
            {
                photos: photos || [],
                documents: documents || [],
                notes: notes || '',
            }
        );

        await createAuditLog(
            auth.userId,
            auth.companyId,
            'update',
            'weight_dispute',
            disputeId,
            {
                action: 'submit_evidence',
                photoCount: photos?.length || 0,
                docCount: documents?.length || 0,
            },
            req
        );

        sendSuccess(res, { dispute }, 'Evidence submitted successfully');
    } catch (error: any) {
        if (error.statusCode === 403) {
            sendError(res, error.message, 403, 'FORBIDDEN');
            return;
        }
        if (error.statusCode === 404) {
            sendError(res, error.message, 404, 'DISPUTE_NOT_FOUND');
            return;
        }
        if (error.statusCode === 400) {
            sendError(res, error.message, 400, 'INVALID_OPERATION');
            return;
        }
        logger.error('Error submitting seller evidence:', error);
        next(error);
    }
};

/**
 * POST /api/v1/disputes/weight/:disputeId/resolve
 * Admin resolves dispute (requires admin role)
 * 
 * Body:
 * - outcome: 'seller_favor' | 'shipcrowd_favor' | 'split' | 'waived'
 * - adjustedWeight?: { value: number, unit: 'kg' | 'g' }
 * - refundAmount?: number
 * - deductionAmount?: number
 * - reasonCode: string
 * - notes: string
 */
export const resolveDispute = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        // Admin check (assuming role is in auth object)
        // TODO: Implement proper role-based authorization
        // if (!auth.roles?.includes('admin')) {
        //   sendError(res, 'Admin access required', 403, 'FORBIDDEN');
        //   return;
        // }

        const { disputeId } = req.params;
        if (!validateObjectId(disputeId, res, 'dispute')) return;

        // Validation
        const { outcome, adjustedWeight, refundAmount, deductionAmount, reasonCode, notes } = req.body;

        if (!outcome || !reasonCode || !notes) {
            sendValidationError(res, [
                {
                    code: 'VALIDATION_ERROR',
                    message: 'outcome, reasonCode, and notes are required',
                    field: 'resolution',
                },
            ]);
            return;
        }

        const validOutcomes = ['seller_favor', 'shipcrowd_favor', 'split', 'waived'];
        if (!validOutcomes.includes(outcome)) {
            sendValidationError(res, [
                {
                    code: 'VALIDATION_ERROR',
                    message: `outcome must be one of: ${validOutcomes.join(', ')}`,
                    field: 'outcome',
                },
            ]);
            return;
        }

        // Resolve dispute via service
        const dispute = await WeightDisputeResolutionService.resolveDispute(
            disputeId,
            auth.userId,
            {
                outcome,
                adjustedWeight,
                refundAmount,
                deductionAmount,
                reasonCode,
                notes,
            }
        );

        await createAuditLog(
            auth.userId,
            auth.companyId,
            'update',
            'weight_dispute',
            disputeId,
            {
                action: 'resolve',
                outcome,
                refundAmount,
                deductionAmount,
            },
            req
        );

        sendSuccess(res, { dispute }, 'Dispute resolved successfully');
    } catch (error: any) {
        if (error.statusCode === 404) {
            sendError(res, error.message, 404, 'DISPUTE_NOT_FOUND');
            return;
        }
        if (error.statusCode === 400) {
            sendError(res, error.message, 400, 'VALIDATION_ERROR');
            return;
        }
        logger.error('Error resolving dispute:', error);
        next(error);
    }
};

/**
 * GET /api/v1/disputes/weight/analytics
 * Get dispute analytics (admin only)
 * 
 * Query params:
 * - startDate, endDate: Date range
 * - companyId: Filter by company (optional)
 */
export const getAnalytics = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        // Admin check
        // TODO: Implement proper role-based authorization
        // if (!auth.roles?.includes('admin')) {
        //   sendError(res, 'Admin access required', 403, 'FORBIDDEN');
        //   return;
        // }

        const dateRange = req.query.startDate && req.query.endDate
            ? {
                start: new Date(req.query.startDate as string),
                end: new Date(req.query.endDate as string),
            }
            : undefined;

        const companyId = req.query.companyId as string | undefined;

        // Get comprehensive stats
        const stats = await WeightDisputeAnalyticsService.getComprehensiveStats(
            companyId,
            dateRange
        );

        // Get trends
        const trends = dateRange
            ? await WeightDisputeAnalyticsService.getDisputeTrends(
                dateRange,
                (req.query.groupBy as 'day' | 'week' | 'month') || 'day'
            )
            : [];

        // Get high-risk sellers
        const highRiskSellers = await WeightDisputeAnalyticsService.identifyHighRiskSellers(
            dateRange,
            20
        );

        sendSuccess(
            res,
            {
                stats,
                trends,
                highRiskSellers,
            },
            'Analytics retrieved successfully'
        );
    } catch (error) {
        logger.error('Error fetching analytics:', error);
        next(error);
    }
};

/**
 * GET /api/v1/disputes/weight/metrics
 * Get basic dispute metrics for company dashboard
 */
export const getMetrics = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const dateRange = req.query.startDate && req.query.endDate
            ? {
                start: new Date(req.query.startDate as string),
                end: new Date(req.query.endDate as string),
            }
            : undefined;

        const metrics = await WeightDisputeResolutionService.getDisputeMetrics(
            auth.companyId,
            dateRange
        );

        sendSuccess(res, { metrics }, 'Metrics retrieved successfully');
    } catch (error) {
        logger.error('Error fetching metrics:', error);
        next(error);
    }
};

export default {
    listDisputes,
    getDisputeDetails,
    submitSellerEvidence,
    resolveDispute,
    getAnalytics,
    getMetrics,
};
