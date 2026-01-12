import { Request, Response, NextFunction } from 'express';
import WalletService from '../../../../core/application/services/wallet/wallet.service';
import { TransactionType, TransactionReason } from '../../../../infrastructure/database/mongoose/models';
import { guardChecks } from '../../../../shared/helpers/controller.helpers';
import { sendSuccess } from '../../../../shared/utils/responseHelper';
import { ValidationError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';
import {
    rechargeWalletSchema,
    updateWalletThresholdSchema,
    refundTransactionSchema
} from '../../../../shared/validation/schemas/financial.schemas';

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
        const auth = guardChecks(req);

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
        const auth = guardChecks(req);

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;

        const options = {
            type: req.query.type as TransactionType | undefined,
            reason: req.query.reason as TransactionReason | undefined,
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
        const auth = guardChecks(req);

        const validation = rechargeWalletSchema.safeParse(req.body);
        if (!validation.success) {
            const details = validation.error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', details);
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
        const auth = guardChecks(req);

        const { transactionId } = req.params;

        const validation = refundTransactionSchema.safeParse(req.body);
        if (!validation.success) {
            const details = validation.error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', details);
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
        const auth = guardChecks(req);

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
        const auth = guardChecks(req);

        const validation = updateWalletThresholdSchema.safeParse(req.body);
        if (!validation.success) {
            const details = validation.error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', details);
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
