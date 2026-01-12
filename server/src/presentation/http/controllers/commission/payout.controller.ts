/**
 * Payout Controller
 */

import { Request, Response, NextFunction } from 'express';
import { PayoutProcessingService } from '../../../../core/application/services/commission/index';
import { AppError } from '../../../../shared/errors/index';
import { ValidationError } from '../../../../shared/errors/app.error';
import {
    initiatePayoutSchema,
    processBatchPayoutsSchema,
    listPayoutsQuerySchema,
    idParamSchema,
} from '../../../../shared/validation/commission-schemas';

export class PayoutController {
    /**
     * Initiate a payout
     * POST /commission/payouts
     */
    static async initiatePayout(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            const userId = req.user?._id;

            if (!companyId || !userId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

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
                String(userId),
                String(companyId)
            );

            res.status(201).json({
                success: true,
                message: 'Payout initiated successfully',
                data: payout,
            });
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
            const companyId = req.user?.companyId;
            const userId = req.user?._id;

            if (!companyId || !userId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

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
                String(userId),
                String(companyId)
            );

            res.status(200).json({
                success: true,
                message: `Batch processing completed: ${result.success} succeeded, ${result.failed} failed`,
                data: result,
            });
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
            const signature = req.headers['x-razorpay-signature'] as string;
            const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

            if (!signature) {
                throw new AppError('Missing webhook signature', 'BAD_REQUEST', 400);
            }

            await PayoutProcessingService.handleWebhook(req.body, signature, webhookSecret);

            res.status(200).json({ success: true });
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
            const companyId = req.user?.companyId;

            if (!companyId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

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
                String(companyId),
                {
                    status: status as string | undefined,
                    salesRepId: salesRepId as string | undefined,
                    startDate: startDate ? new Date(startDate) : undefined,
                    endDate: endDate ? new Date(endDate) : undefined,
                },
                { page, limit }
            );

            res.status(200).json({
                success: true,
                data: result.data,
                pagination: {
                    page,
                    limit,
                    total: result.total,
                    totalPages: Math.ceil(result.total / limit),
                },
            });
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
            const companyId = req.user?.companyId;
            const { id } = req.params;

            if (!companyId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            const paramValidation = idParamSchema.safeParse({ id });
            if (!paramValidation.success) {
                throw new AppError('Invalid payout ID', 'BAD_REQUEST', 400);
            }

            const payout = await PayoutProcessingService.getPayout(id, String(companyId));

            res.status(200).json({
                success: true,
                data: payout,
            });
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
            const companyId = req.user?.companyId;
            const userId = req.user?._id;
            const { id } = req.params;

            if (!companyId || !userId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            const payout = await PayoutProcessingService.retryPayout(
                id,
                String(userId),
                String(companyId)
            );

            res.status(200).json({
                success: true,
                message: 'Payout retry initiated',
                data: payout,
            });
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
            const companyId = req.user?.companyId;
            const userId = req.user?._id;
            const { id } = req.params;

            if (!companyId || !userId) {
                throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
            }

            const payout = await PayoutProcessingService.cancelPayout(
                id,
                String(userId),
                String(companyId)
            );

            res.status(200).json({
                success: true,
                message: 'Payout cancelled successfully',
                data: payout,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default PayoutController;
