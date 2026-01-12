import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import CODRemittanceService from '../../../../core/application/services/finance/cod-remittance.service';
import { guardChecks } from '../../../../shared/helpers/controller.helpers';
import {
    sendSuccess,
    sendError,
    sendValidationError,
    sendCreated,
} from '../../../../shared/utils/responseHelper';
import logger from '../../../../shared/logger/winston.logger';

// Validation schemas
const createRemittanceSchema = z.object({
    scheduleType: z.enum(['scheduled', 'on_demand', 'manual']),
    cutoffDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});

const approveRemittanceSchema = z.object({
    approvalNotes: z.string().max(500).optional(),
});

const cancelRemittanceSchema = z.object({
    reason: z.string().min(10).max(500),
});

/**
 * Get eligible shipments for remittance
 * GET /api/v1/finance/cod-remittance/eligible-shipments?cutoffDate=YYYY-MM-DD
 */
export const getEligibleShipments = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const cutoffDate = req.query.cutoffDate
            ? new Date(req.query.cutoffDate as string)
            : new Date();

        const result = await CODRemittanceService.getEligibleShipments(
            auth.companyId,
            cutoffDate
        );

        sendSuccess(res, result, 'Eligible shipments retrieved successfully');
    } catch (error) {
        logger.error('Error fetching eligible shipments:', error);
        next(error);
    }
};

/**
 * Create new COD remittance batch
 * POST /api/v1/finance/cod-remittance/create
 */
export const createRemittanceBatch = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const validation = createRemittanceSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map((err) => ({
                code: 'VALIDATION_ERROR',
                message: err.message,
                field: err.path.join('.'),
            }));
            sendValidationError(res, errors);
            return;
        }

        const cutoffDate = new Date(validation.data.cutoffDate);

        const result = await CODRemittanceService.createRemittanceBatch(
            auth.companyId,
            validation.data.scheduleType,
            cutoffDate,
            auth.userId
        );

        sendCreated(res, result, 'COD remittance batch created successfully');
    } catch (error) {
        logger.error('Error creating remittance batch:', error);
        next(error);
    }
};

/**
 * Get remittance details by ID
 * GET /api/v1/finance/cod-remittance/:id
 */
export const getRemittanceDetails = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { id } = req.params;

        const remittance = await CODRemittanceService.getRemittanceDetails(id, auth.companyId);

        sendSuccess(res, { remittance }, 'Remittance details retrieved successfully');
    } catch (error) {
        logger.error('Error fetching remittance details:', error);
        next(error);
    }
};

/**
 * List all remittances for company
 * GET /api/v1/finance/cod-remittance?status=pending&page=1&limit=10
 */
export const listRemittances = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const status = req.query.status as string | undefined;
        const startDate = req.query.startDate
            ? new Date(req.query.startDate as string)
            : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const result = await CODRemittanceService.listRemittances(auth.companyId, {
            status,
            startDate,
            endDate,
            page,
            limit,
        });

        res.status(200).json({
            success: true,
            data: result.remittances,
            pagination: result.pagination,
            message: 'Remittances retrieved successfully',
        });
    } catch (error) {
        logger.error('Error listing remittances:', error);
        next(error);
    }
};

/**
 * Approve remittance batch (Admin only)
 * POST /api/v1/finance/cod-remittance/:id/approve
 */
export const approveRemittance = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { id } = req.params;

        const validation = approveRemittanceSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map((err) => ({
                code: 'VALIDATION_ERROR',
                message: err.message,
                field: err.path.join('.'),
            }));
            sendValidationError(res, errors);
            return;
        }

        const result = await CODRemittanceService.approveRemittance(
            id,
            auth.userId,
            validation.data.approvalNotes
        );

        sendSuccess(res, result, 'Remittance batch approved successfully');
    } catch (error) {
        logger.error('Error approving remittance:', error);
        next(error);
    }
};

/**
 * Initiate payout via Razorpay (Admin only)
 * POST /api/v1/finance/cod-remittance/:id/initiate-payout
 */
export const initiatePayout = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { id } = req.params;

        const result = await CODRemittanceService.initiatePayout(id);

        if (result.success) {
            sendSuccess(res, result, 'Payout initiated successfully');
        } else {
            sendError(res, result.failureReason || 'Payout initiation failed', 500, 'PAYOUT_FAILED');
        }
    } catch (error) {
        logger.error('Error initiating payout:', error);
        next(error);
    }
};

/**
 * Cancel remittance batch
 * POST /api/v1/finance/cod-remittance/:id/cancel
 */
export const cancelRemittance = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { id } = req.params;

        const validation = cancelRemittanceSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map((err) => ({
                code: 'VALIDATION_ERROR',
                message: err.message,
                field: err.path.join('.'),
            }));
            sendValidationError(res, errors);
            return;
        }

        await CODRemittanceService.cancelRemittance(id, auth.userId, validation.data.reason);

        sendSuccess(res, null, 'Remittance batch cancelled successfully');
    } catch (error) {
        logger.error('Error cancelling remittance:', error);
        next(error);
    }
};

export default {
    getEligibleShipments,
    createRemittanceBatch,
    getRemittanceDetails,
    listRemittances,
    approveRemittance,
    initiatePayout,
    cancelRemittance,
};
