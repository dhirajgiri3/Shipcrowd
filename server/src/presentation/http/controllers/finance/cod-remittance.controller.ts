import { Request, Response, NextFunction } from 'express';
import CODRemittanceService from '../../../../core/application/services/finance/cod-remittance.service';
import { guardChecks } from '../../../../shared/helpers/controller.helpers';
import { sendSuccess, sendCreated, sendPaginated } from '../../../../shared/utils/responseHelper';
import { ValidationError, AppError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import logger from '../../../../shared/logger/winston.logger';
import {
    createRemittanceSchema,
    approveRemittanceSchema,
    cancelRemittanceSchema
} from '../../../../shared/validation/schemas/financial.schemas';

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
        const auth = guardChecks(req);

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
        const auth = guardChecks(req);

        const validation = createRemittanceSchema.safeParse(req.body);
        if (!validation.success) {
            const details = validation.error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', details);
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
        const auth = guardChecks(req);

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
        const auth = guardChecks(req);

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

        const pagination = {
            ...result.pagination,
            pages: result.pagination.totalPages,
            hasNext: result.pagination.page < result.pagination.totalPages,
            hasPrev: result.pagination.page > 1
        };
        sendPaginated(res, result.remittances, pagination, 'Remittances retrieved successfully');
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
        const auth = guardChecks(req);

        const { id } = req.params;

        const validation = approveRemittanceSchema.safeParse(req.body);
        if (!validation.success) {
            const details = validation.error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', details);
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
        const auth = guardChecks(req);

        const { id } = req.params;

        const result = await CODRemittanceService.initiatePayout(id);

        if (result.success) {
            sendSuccess(res, result, 'Payout initiated successfully');
        } else {
            throw new AppError(result.failureReason || 'Payout initiation failed', ErrorCode.EXT_PAYMENT_FAILURE, 500);
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
        const auth = guardChecks(req);

        const { id } = req.params;

        const validation = cancelRemittanceSchema.safeParse(req.body);
        if (!validation.success) {
            const details = validation.error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', details);
        }

        await CODRemittanceService.cancelRemittance(id, auth.userId, validation.data.reason);

        sendSuccess(res, null, 'Remittance batch cancelled successfully');
    } catch (error) {
        logger.error('Error cancelling remittance:', error);
        next(error);
    }
};


/**
 * Get COD settlement timeline (4-stage pipeline)
 * GET /api/v1/finance/cod-remittance/timeline
 */
export const getTimeline = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req);
        const timeline = await CODRemittanceService.getTimeline(auth.companyId);
        sendSuccess(res, timeline, 'COD timeline retrieved successfully');
    } catch (error) {
        logger.error('Error fetching COD timeline:', error);
        next(error);
    }
};


/**
 * Get dashboard stats
 * GET /api/v1/finance/cod-remittance/dashboard
 */
export const getDashboard = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req);
        const stats = await CODRemittanceService.getDashboardStats(auth.companyId);
        sendSuccess(res, stats, 'Dashboard stats retrieved successfully');
    } catch (error) {
        logger.error('Error fetching dashboard stats:', error);
        next(error);
    }
};

/**
 * Handle Velocity settlement webhook
 * POST /api/v1/finance/cod-remittance/webhook
 */
export const handleWebhook = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const payload = req.body;
        // Verify signature here if needed
        await CODRemittanceService.handleSettlementWebhook(payload);
        sendSuccess(res, null, 'Webhook processed successfully');
    } catch (error) {
        logger.error('Error processing webhook:', error);
        next(error);
    }
};

/**
 * Request on-demand payout
 * POST /api/v1/finance/cod-remittance/request-payout
 */
export const requestPayout = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req);
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            throw new ValidationError('Valid amount is required');
        }

        const result = await CODRemittanceService.requestPayout(auth.companyId, amount, auth.userId);
        sendSuccess(res, result, 'Payout requested successfully');
    } catch (error) {
        logger.error('Error requesting payout:', error);
        next(error);
    }
};

/**
 * Schedule payout preference
 * POST /api/v1/finance/cod-remittance/schedule-payout
 */
export const schedulePayout = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req);
        const schedule = req.body; // Validation normally via schema

        const result = await CODRemittanceService.schedulePayout(auth.companyId, schedule);
        sendSuccess(res, result, 'Payout schedule updated successfully');
    } catch (error) {
        logger.error('Error scheduling payout:', error);
        next(error);
    }
};
