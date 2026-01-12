import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import WalletService from '../../../../core/application/services/wallet/wallet.service';
import { guardChecks } from '../../../../shared/helpers/controller.helpers';
import {
    sendSuccess,
    sendValidationError,
} from '../../../../shared/utils/responseHelper';
import logger from '../../../../shared/logger/winston.logger';

// Validation schemas
const rechargeSchema = z.object({
    amount: z.number().positive('Amount must be positive').max(1000000, 'Amount cannot exceed ₹10,00,000'),
    paymentId: z.string().min(1, 'Payment ID is required'),
});

const updateThresholdSchema = z.object({
    threshold: z.number().min(0, 'Threshold must be non-negative').max(100000, 'Threshold cannot exceed ₹1,00,000'),
});

const refundSchema = z.object({
    reason: z.string().min(10, 'Reason must be at least 10 characters').max(500, 'Reason too long'),
});

/**
 * Get wallet balance
 * GET /api/v1/finance/wallet/balance
 */
export const getBalance = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const balance = await WalletService.getBalance(auth.companyId);

        sendSuccess(res, balance, 'Wallet balance retrieved successfully');
    } catch (error) {
        logger.error('Error fetching wallet balance:', error);
        next(error);
    }
};

/**
 * Get transaction history
 * GET /api/v1/finance/wallet/transactions?page=1&limit=10&type=credit&reason=recharge&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
export const getTransactionHistory = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;

        const options = {
            type: req.query.type as any,
            reason: req.query.reason as any,
            startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
            endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
            limit,
            offset,
        };

        const result = await WalletService.getTransactionHistory(auth.companyId, options);

        res.status(200).json({
            success: true,
            data: {
                transactions: result.transactions,
                balance: result.balance,
            },
            pagination: {
                page,
                limit,
                total: result.total,
                totalPages: Math.ceil(result.total / limit),
            },
            message: 'Transaction history retrieved successfully',
        });
    } catch (error) {
        logger.error('Error fetching transaction history:', error);
        next(error);
    }
};

/**
 * Handle wallet recharge
 * POST /api/v1/finance/wallet/recharge
 */
export const rechargeWallet = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const validation = rechargeSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map((err) => ({
                code: 'VALIDATION_ERROR',
                message: err.message,
                field: err.path.join('.'),
            }));
            sendValidationError(res, errors);
            return;
        }

        const { amount, paymentId } = validation.data;

        const result = await WalletService.handleRecharge(
            auth.companyId,
            amount,
            paymentId,
            auth.userId
        );

        if (result.success) {
            sendSuccess(
                res,
                {
                    transactionId: result.transactionId,
                    newBalance: result.newBalance,
                },
                'Wallet recharged successfully'
            );
        } else {
            res.status(400).json({
                success: false,
                message: result.error || 'Recharge failed',
            });
        }
    } catch (error) {
        logger.error('Error recharging wallet:', error);
        next(error);
    }
};

/**
 * Refund a transaction (Admin only)
 * POST /api/v1/finance/wallet/refund/:transactionId
 */
export const refundTransaction = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { transactionId } = req.params;

        const validation = refundSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map((err) => ({
                code: 'VALIDATION_ERROR',
                message: err.message,
                field: err.path.join('.'),
            }));
            sendValidationError(res, errors);
            return;
        }

        const { reason } = validation.data;

        const result = await WalletService.refund(
            auth.companyId,
            transactionId,
            reason,
            auth.userId
        );

        if (result.success) {
            sendSuccess(
                res,
                {
                    transactionId: result.transactionId,
                    newBalance: result.newBalance,
                },
                'Transaction refunded successfully'
            );
        } else {
            res.status(400).json({
                success: false,
                message: result.error || 'Refund failed',
            });
        }
    } catch (error) {
        logger.error('Error refunding transaction:', error);
        next(error);
    }
};

/**
 * Get wallet statistics
 * GET /api/v1/finance/wallet/stats?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
export const getWalletStats = async (
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

        const stats = await WalletService.getWalletStats(auth.companyId, dateRange);

        sendSuccess(res, stats, 'Wallet statistics retrieved successfully');
    } catch (error) {
        logger.error('Error fetching wallet stats:', error);
        next(error);
    }
};

/**
 * Update low balance threshold
 * PUT /api/v1/finance/wallet/threshold
 */
export const updateLowBalanceThreshold = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const validation = updateThresholdSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map((err) => ({
                code: 'VALIDATION_ERROR',
                message: err.message,
                field: err.path.join('.'),
            }));
            sendValidationError(res, errors);
            return;
        }

        const { threshold } = validation.data;

        const result = await WalletService.updateLowBalanceThreshold(
            auth.companyId,
            threshold,
            auth.userId
        );

        sendSuccess(res, result, 'Low balance threshold updated successfully');
    } catch (error) {
        logger.error('Error updating threshold:', error);
        next(error);
    }
};

export default {
    getBalance,
    getTransactionHistory,
    rechargeWallet,
    refundTransaction,
    getWalletStats,
    updateLowBalanceThreshold,
};
