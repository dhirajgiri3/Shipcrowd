/**
 * Commission Transaction Controller
 * 
 * Handles HTTP endpoints for commission transaction management:
 * - List transactions (with filters)
 * - Get transaction details
 * - Approve/reject transactions
 * - Bulk operations
 * - Add adjustments
 */

import { Request, Response, NextFunction } from 'express';
import {
    CommissionCalculationService,
    CommissionApprovalService,
} from '../../../../core/application/services/commission/index';
import { AppError } from '../../../../shared/errors/index';
import { ValidationError } from '../../../../shared/errors/app.error';
import {
    listTransactionsQuerySchema,
    approveTransactionSchema,
    rejectTransactionSchema,
    bulkApproveSchema,
    bulkRejectSchema,
    addAdjustmentSchema,
    bulkCalculateSchema,
    idParamSchema,
} from '../../../../shared/validation/commission-schemas';
import logger from '../../../../shared/logger/winston.logger';
import { sendSuccess, sendPaginated, calculatePagination } from '../../../../shared/utils/responseHelper';

export class CommissionTransactionController {
    /**
     * List commission transactions
     * GET /commission/transactions
     * Auth: authenticated
     */
    static async listTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;

            if (!companyId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            // Validate query parameters
            const validation = listTransactionsQuerySchema.safeParse(req.query);
            if (!validation.success) {
                const details = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', details);
            }

            const { page, limit, status, salesRepId, startDate, endDate, sortBy, sortOrder } =
                validation.data;

            const result = await CommissionCalculationService.listTransactions(
                String(companyId),
                {
                    status: status as string | undefined,
                    salesRepId: salesRepId as string | undefined,
                    startDate: startDate ? new Date(startDate) : undefined,
                    endDate: endDate ? new Date(endDate) : undefined,
                },
                { page, limit }
            );

            const pagination = calculatePagination(result.total, page, limit);
            sendPaginated(res, result.data, pagination);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get a single commission transaction
     * GET /commission/transactions/:id
     * Auth: authenticated
     */
    static async getTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            const { id } = req.params;

            if (!companyId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            // Validate ID param
            const paramValidation = idParamSchema.safeParse({ id });
            if (!paramValidation.success) {
                throw new AppError('Invalid transaction ID', 'BAD_REQUEST', 400);
            }

            const transaction = await CommissionCalculationService.getTransaction(id, String(companyId));

            sendSuccess(res, transaction);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Approve a commission transaction
     * POST /commission/transactions/:id/approve
     * Auth: admin, manager
     */
    static async approveTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            const userId = req.user?._id;
            const { id } = req.params;

            if (!companyId || !userId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            // Validate request body
            const validation = approveTransactionSchema.safeParse(req.body);
            if (!validation.success) {
                const details = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', details);
            }

            const transaction = await CommissionApprovalService.approveTransaction(
                { transactionId: id, notes: validation.data.notes },
                String(userId),
                String(companyId)
            );

            sendSuccess(res, transaction, 'Commission transaction approved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Reject a commission transaction
     * POST /commission/transactions/:id/reject
     * Auth: admin, manager
     */
    static async rejectTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            const userId = req.user?._id;
            const { id } = req.params;

            if (!companyId || !userId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            // Validate request body
            const validation = rejectTransactionSchema.safeParse(req.body);
            if (!validation.success) {
                const details = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', details);
            }

            const transaction = await CommissionApprovalService.rejectTransaction(
                { transactionId: id, reason: validation.data.reason },
                String(userId),
                String(companyId)
            );

            sendSuccess(res, transaction, 'Commission transaction rejected successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Bulk approve transactions
     * POST /commission/transactions/bulk-approve
     * Auth: admin, manager
     */
    static async bulkApprove(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            const userId = req.user?._id;

            if (!companyId || !userId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            // Validate request body
            const validation = bulkApproveSchema.safeParse(req.body);
            if (!validation.success) {
                const details = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', details);
            }

            const result = await CommissionApprovalService.bulkApprove(
                { transactionIds: validation.data.transactionIds },
                String(userId),
                String(companyId)
            );

            sendSuccess(res, result, `Bulk approve completed: ${result.success} succeeded, ${result.failed} failed`);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Bulk reject transactions
     * POST /commission/transactions/bulk-reject
     * Auth: admin, manager
     */
    static async bulkReject(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            const userId = req.user?._id;

            if (!companyId || !userId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            // Validate request body
            const validation = bulkRejectSchema.safeParse(req.body);
            if (!validation.success) {
                const details = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', details);
            }

            const result = await CommissionApprovalService.bulkReject(
                {
                    transactionIds: validation.data.transactionIds,
                    reason: validation.data.reason,
                },
                String(userId),
                String(companyId)
            );

            sendSuccess(res, result, `Bulk reject completed: ${result.success} succeeded, ${result.failed} failed`);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Add adjustment to a transaction
     * POST /commission/transactions/:id/adjustment
     * Auth: admin, manager
     */
    static async addAdjustment(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            const userId = req.user?._id;
            const { id } = req.params;

            if (!companyId || !userId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            // Validate request body
            const validation = addAdjustmentSchema.safeParse(req.body);
            if (!validation.success) {
                const details = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', details);
            }

            const transaction = await CommissionApprovalService.addAdjustment(
                {
                    transactionId: id,
                    amount: validation.data.amount,
                    reason: validation.data.reason,
                    adjustmentType: validation.data.adjustmentType,
                },
                String(userId),
                String(companyId)
            );

            sendSuccess(res, transaction, 'Adjustment added successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get pending transactions for approval
     * GET /commission/transactions/pending
     * Auth: admin, manager
     */
    static async getPending(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;

            if (!companyId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            const { salesRepId, minAmount, page = 1, limit = 20 } = req.query;
            const pageNum = Number(page);
            const limitNum = Number(limit);

            const result = await CommissionApprovalService.getPendingTransactions(
                String(companyId),
                {
                    salesRepId: salesRepId as string,
                    minAmount: minAmount ? Number(minAmount) : undefined,
                },
                { page: pageNum, limit: limitNum }
            );

            const pagination = calculatePagination(result.total, pageNum, limitNum);
            sendPaginated(res, result.data, pagination);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Bulk calculate commissions
     * POST /commission/transactions/bulk-calculate
     * Auth: admin, manager
     */
    static async bulkCalculate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;

            if (!companyId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            // Validate request body
            const validation = bulkCalculateSchema.safeParse(req.body);
            if (!validation.success) {
                const details = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', details);
            }

            const { orderIds, salesRepId } = validation.data;

            const result = await CommissionCalculationService.bulkCalculate(
                orderIds,
                salesRepId,
                String(companyId)
            );

            sendSuccess(res, result, `Bulk calculation completed: ${result.success} succeeded, ${result.failed} failed`);
        } catch (error) {
            next(error);
        }
    }
}

export default CommissionTransactionController;
