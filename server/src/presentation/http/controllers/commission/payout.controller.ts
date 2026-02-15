/**
 * Payout Controller
 */

import { NextFunction, Request, Response } from 'express';
import { PayoutProcessingService } from '../../../../core/application/services/commission/index';
import { ValidationError } from '../../../../shared/errors/app.error';
import { AppError } from '../../../../shared/errors/index';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import { calculatePagination, sendCreated, sendPaginated, sendSuccess } from '../../../../shared/utils/responseHelper';
import {
idParamSchema,
initiatePayoutSchema,
listPayoutsQuerySchema,
processBatchPayoutsSchema,
} from '../../../../shared/validation/commission-schemas';

export class PayoutController {
    /**
     * Initiate a payout
     * POST /commission/payouts
     */
    static async initiatePayout(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);

            const validation = initiatePayoutSchema.safeParse(req.body);
            if (!validation.success) {
                const details = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', details);
            }

            const payout = await PayoutProcessingService.initiatePayout(
                validation.data,
                String(auth.userId),
                String(auth.companyId)
            );

            sendCreated(res, payout, 'Payout initiated successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Process batch payouts
     * POST /commission/payouts/batch
     */
    static async processBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);

            const validation = processBatchPayoutsSchema.safeParse(req.body);
            if (!validation.success) {
                const details = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', details);
            }

            const result = await PayoutProcessingService.processBatchPayouts(
                validation.data,
                String(auth.userId),
                String(auth.companyId)
            );

            sendSuccess(res, result, `Batch processing completed: ${result.success} succeeded, ${result.failed} failed`);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Handle Razorpay webhook
     * POST /commission/payouts/webhook
     */
    static async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await PayoutProcessingService.handleWebhook(req.body);

            sendSuccess(res, { success: true });
        } catch (error) {
            next(error);
        }
    }

    /**
     * List payouts
     * GET /commission/payouts
     */
    static async listPayouts(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);

            const validation = listPayoutsQuerySchema.safeParse(req.query);
            if (!validation.success) {
                const details = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', details);
            }

            const { page, limit, status, salesRepId, startDate, endDate } = validation.data;

            const result = await PayoutProcessingService.listPayouts(
                String(auth.companyId),
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
     * Get payout details
     * GET /commission/payouts/:id
     */
    static async getPayout(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const { id } = req.params;

            const paramValidation = idParamSchema.safeParse({ id });
            if (!paramValidation.success) {
                throw new AppError('Invalid payout ID', 'BAD_REQUEST', 400);
            }

            const payout = await PayoutProcessingService.getPayout(id, String(auth.companyId));

            sendSuccess(res, payout);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Retry failed payout
     * POST /commission/payouts/:id/retry
     */
    static async retryPayout(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const { id } = req.params;

            const payout = await PayoutProcessingService.retryPayout(
                id,
                String(auth.userId),
                String(auth.companyId)
            );

            sendSuccess(res, payout, 'Payout retry initiated');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Cancel payout
     * POST /commission/payouts/:id/cancel
     */
    static async cancelPayout(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const { id } = req.params;

            const payout = await PayoutProcessingService.cancelPayout(
                id,
                String(auth.userId),
                String(auth.companyId)
            );

            sendSuccess(res, payout, 'Payout cancelled successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default PayoutController;
