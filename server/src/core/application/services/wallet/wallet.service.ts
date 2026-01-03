/**
 * WalletService
 *
 * Manages company wallet operations including balance checks, credits, debits,
 * and transaction history. Uses optimistic locking to prevent race conditions.
 */

import mongoose from 'mongoose';
import Company from '../../../../infrastructure/database/mongoose/models/company.model';
import WalletTransaction, {
    IWalletTransaction,
    TransactionType,
    TransactionReason,
} from '../../../../infrastructure/database/mongoose/models/wallet-transaction.model';
import logger from '../../../../shared/logger/winston.logger';
import { AppError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';

interface TransactionResult {
    success: boolean;
    transactionId?: string;
    newBalance?: number;
    error?: string;
}

interface TransactionReference {
    type: 'rto_event' | 'shipment' | 'payment' | 'order' | 'manual';
    id?: string;
    externalId?: string;
}

interface TransactionHistoryOptions {
    startDate?: Date;
    endDate?: Date;
    type?: TransactionType;
    reason?: TransactionReason;
    limit?: number;
    offset?: number;
}

export default class WalletService {
    /**
     * Get current wallet balance for a company
     */
    static async getBalance(companyId: string): Promise<{
        balance: number;
        currency: string;
        lastUpdated?: Date;
        lowBalanceThreshold: number;
        isLowBalance: boolean;
    }> {
        const company = await Company.findById(companyId).select('wallet');

        if (!company) {
            throw new AppError('Company not found', 'COMPANY_NOT_FOUND', 404);
        }

        const wallet = company.wallet || { balance: 0, currency: 'INR', lowBalanceThreshold: 500 };

        return {
            balance: wallet.balance,
            currency: wallet.currency,
            lastUpdated: wallet.lastUpdated,
            lowBalanceThreshold: wallet.lowBalanceThreshold,
            isLowBalance: wallet.balance < wallet.lowBalanceThreshold,
        };
    }

    /**
     * Check if company has minimum required balance
     */
    static async hasMinimumBalance(companyId: string, requiredAmount: number): Promise<boolean> {
        const { balance } = await this.getBalance(companyId);
        return balance >= requiredAmount;
    }

    /**
     * Credit funds to wallet (add money)
     */
    static async credit(
        companyId: string,
        amount: number,
        reason: TransactionReason,
        description: string,
        reference?: TransactionReference,
        createdBy: string = 'system'
    ): Promise<TransactionResult> {
        // Input validation - prevent negative amounts
        if (amount <= 0) {
            logger.error('Invalid credit amount', { companyId, amount });
            return {
                success: false,
                error: `Invalid amount: ${amount}. Amount must be positive.`,
            };
        }

        return this.executeTransaction(companyId, 'credit', amount, reason, description, reference, createdBy);
    }

    /**
     * Debit funds from wallet (deduct money)
     */
    static async debit(
        companyId: string,
        amount: number,
        reason: TransactionReason,
        description: string,
        reference?: TransactionReference,
        createdBy: string = 'system'
    ): Promise<TransactionResult> {
        // Input validation - prevent negative amounts
        if (amount <= 0) {
            logger.error('Invalid debit amount', { companyId, amount });
            return {
                success: false,
                error: `Invalid amount: ${amount}. Amount must be positive.`,
            };
        }

        // TOCTOU FIX: Balance check moved inside transaction (executeTransaction)
        // This prevents race condition where balance is checked outside session
        return this.executeTransaction(companyId, 'debit', amount, reason, description, reference, createdBy);
    }

    /**
     * Execute wallet transaction with optimistic locking
     * @param externalSession - Optional external session for transaction isolation with calling service
     */
    private static async executeTransaction(
        companyId: string,
        type: TransactionType,
        amount: number,
        reason: TransactionReason,
        description: string,
        reference?: TransactionReference,
        createdBy: string = 'system',
        retryCount: number = 0,
        externalSession?: mongoose.ClientSession
    ): Promise<TransactionResult> {
        const MAX_RETRIES = 3;

        // FIX: Support external session for transaction isolation
        // If external session provided, use it; otherwise create our own
        const useExternalSession = !!externalSession;
        const session = externalSession || await mongoose.startSession();

        if (!useExternalSession) {
            session.startTransaction();
        }

        try {
            // Get company with version for optimistic locking
            const company = await Company.findById(companyId).session(session);

            if (!company) {
                throw new AppError('Company not found', 'COMPANY_NOT_FOUND', 404);
            }

            const currentBalance = company.wallet?.balance || 0;
            const balanceChange = type === 'debit' ? -amount : amount;
            const newBalance = currentBalance + balanceChange;

            // Validate balance for debits (INSIDE transaction to prevent TOCTOU)
            if (type === 'debit' && newBalance < 0) {
                throw new AppError(
                    `Insufficient balance. Current: ₹${currentBalance}, Required: ₹${amount}`,
                    'INSUFFICIENT_BALANCE',
                    400
                );
            }

            // Create transaction record
            const transaction = await WalletTransaction.create(
                [
                    {
                        company: companyId,
                        type,
                        amount,
                        balanceBefore: currentBalance,
                        balanceAfter: newBalance,
                        reason,
                        description,
                        reference: reference
                            ? {
                                type: reference.type,
                                id: reference.id ? new mongoose.Types.ObjectId(reference.id) : undefined,
                                externalId: reference.externalId,
                            }
                            : undefined,
                        createdBy,
                        status: 'completed',
                    },
                ],
                { session }
            );

            // OPTIMISTIC LOCKING: Update with version check
            const currentVersion = company.__v || 0;
            const updateResult = await Company.findOneAndUpdate(
                { _id: companyId, __v: currentVersion }, // Version check prevents lost updates
                {
                    $set: {
                        'wallet.balance': newBalance,
                        'wallet.lastUpdated': new Date(),
                    },
                    $inc: { __v: 1 }, // Increment version
                },
                { session, new: true }
            );

            if (!updateResult) {
                throw new AppError(
                    'Document was modified by another process. Retrying...',
                    ErrorCode.BIZ_VERSION_CONFLICT,
                    409
                );
            }

            await session.commitTransaction();

            logger.info('Wallet transaction completed', {
                transactionId: transaction[0]._id,
                companyId,
                type,
                amount,
                reason,
                balanceBefore: currentBalance,
                balanceAfter: newBalance,
                version: currentVersion + 1,
            });

            // Issue #C: Real-time low balance alert on crossing threshold downward
            if (type === 'debit') {
                const threshold = company.wallet?.lowBalanceThreshold || 500;
                const crossedThreshold = currentBalance >= threshold && newBalance < threshold;

                if (crossedThreshold) {
                    // Non-blocking notification
                    this.triggerLowBalanceAlert(companyId, newBalance, threshold)
                        .catch(err => {
                            logger.error('Failed to send low balance alert', {
                                companyId,
                                error: err.message,
                            });
                        });
                }
            }

            return {
                success: true,
                transactionId: String(transaction[0]._id),
                newBalance,
            };
        } catch (error: any) {
            await session.abortTransaction();

            // RETRY LOGIC: Exponential backoff on version conflicts
            if (error.code === 'VERSION_CONFLICT' && retryCount < MAX_RETRIES) {
                const delay = Math.pow(2, retryCount) * 100 + Math.random() * 100; // Exponential backoff with jitter
                logger.warn('Version conflict detected, retrying...', {
                    companyId,
                    retryCount: retryCount + 1,
                    delayMs: delay,
                });

                await new Promise(resolve => setTimeout(resolve, delay));
                return this.executeTransaction(
                    companyId,
                    type,
                    amount,
                    reason,
                    description,
                    reference,
                    createdBy,
                    retryCount + 1,
                    undefined // Don't pass external session on retry
                );
            }

            logger.error('Wallet transaction failed', {
                companyId,
                type,
                amount,
                reason,
                error: error.message,
                retryCount,
            });

            return {
                success: false,
                error: error.message,
            };
        } finally {
            // Only end session if we created it (not if using external caller's session)
            if (!useExternalSession) {
                session.endSession();
            }
        }
    }

    /**
     * Handle RTO charge deduction specifically
     * @param session - Optional external session for transaction isolation with RTO flow
     */
    static async handleRTOCharge(
        companyId: string,
        rtoEventId: string,
        amount: number,
        shipmentAwb?: string,
        session?: mongoose.ClientSession
    ): Promise<TransactionResult> {
        const description = shipmentAwb
            ? `RTO charges for shipment ${shipmentAwb}`
            : `RTO charges for RTO Event ${rtoEventId}`;

        return this.executeTransaction(
            companyId,
            'debit',
            amount,
            'rto_charge',
            description,
            {
                type: 'rto_event',
                id: rtoEventId,
            },
            'system',
            0,
            session
        );
    }

    /**
     * Handle shipping cost deduction
     */
    static async handleShippingCost(
        companyId: string,
        shipmentId: string,
        amount: number,
        awb: string
    ): Promise<TransactionResult> {
        return this.debit(companyId, amount, 'shipping_cost', `Shipping cost for AWB: ${awb}`, {
            type: 'shipment',
            id: shipmentId,
        });
    }

    /**
     * Handle wallet recharge
     */
    static async handleRecharge(
        companyId: string,
        amount: number,
        paymentId: string,
        createdBy: string
    ): Promise<TransactionResult> {
        return this.credit(
            companyId,
            amount,
            'recharge',
            `Wallet recharge via payment ${paymentId}`,
            {
                type: 'payment',
                id: paymentId,
            },
            createdBy
        );
    }


    /**
     * Handle COD remittance credit
     */
    static async handleCODRemittance(
        companyId: string,
        amount: number,
        shipmentId: string,
        awb: string
    ): Promise<TransactionResult> {
        return this.credit(companyId, amount, 'cod_remittance', `COD remittance for AWB: ${awb}`, {
            type: 'shipment',
            id: shipmentId,
        });
    }

    /**
     * Get transaction history for a company
     */
    static async getTransactionHistory(
        companyId: string,
        options: TransactionHistoryOptions = {}
    ): Promise<{ transactions: IWalletTransaction[]; total: number; balance: number }> {
        const [historyResult, balanceResult] = await Promise.all([
            WalletTransaction.getTransactionHistory(companyId, options),
            this.getBalance(companyId),
        ]);

        return {
            ...historyResult,
            balance: balanceResult.balance,
        };
    }

    /**
     * Refund a previous transaction
     */
    static async refund(
        companyId: string,
        originalTransactionId: string,
        reason: string,
        createdBy: string
    ): Promise<TransactionResult> {
        // Use a session to ensure atomicity
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const originalTransaction = await WalletTransaction.findById(originalTransactionId).session(session);

            if (!originalTransaction) {
                await session.abortTransaction();
                return { success: false, error: 'Original transaction not found' };
            }

            if (originalTransaction.company.toString() !== companyId) {
                await session.abortTransaction();
                return { success: false, error: 'Transaction does not belong to this company' };
            }

            if (originalTransaction.status === 'reversed') {
                await session.abortTransaction();
                return { success: false, error: 'Transaction already reversed' };
            }

            // Mark original as reversed FIRST (prevents duplicate refunds)
            const updateResult = await WalletTransaction.findByIdAndUpdate(
                originalTransactionId,
                {
                    status: 'reversed',
                    reversedBy: createdBy,
                    reversedAt: new Date(),
                },
                { session, new: true }
            );

            if (!updateResult) {
                await session.abortTransaction();
                return { success: false, error: 'Failed to mark transaction as reversed' };
            }

            // Refund is opposite of original transaction
            const refundType = originalTransaction.type === 'debit' ? 'credit' : 'debit';

            // Execute refund transaction within same session
            const company = await Company.findById(companyId).session(session);
            if (!company) {
                await session.abortTransaction();
                return { success: false, error: 'Company not found' };
            }

            const currentBalance = company.wallet?.balance || 0;
            const balanceChange = refundType === 'debit' ? -originalTransaction.amount : originalTransaction.amount;
            const newBalance = currentBalance + balanceChange;

            // Create refund transaction
            const refundTransaction = await WalletTransaction.create(
                [
                    {
                        company: companyId,
                        type: refundType,
                        amount: originalTransaction.amount,
                        balanceBefore: currentBalance,
                        balanceAfter: newBalance,
                        reason: 'refund',
                        description: `Refund: ${reason} (Original: ${originalTransactionId})`,
                        reference: {
                            type: originalTransaction.reference?.type || 'manual',
                            id: originalTransaction.reference?.id,
                        },
                        createdBy,
                        status: 'completed',
                    },
                ],
                { session }
            );

            // Update wallet balance with version check
            const currentVersion = company.__v || 0;
            const walletUpdateResult = await Company.findOneAndUpdate(
                { _id: companyId, __v: currentVersion },
                {
                    $set: {
                        'wallet.balance': newBalance,
                        'wallet.lastUpdated': new Date(),
                    },
                    $inc: { __v: 1 },
                },
                { session, new: true }
            );

            if (!walletUpdateResult) {
                await session.abortTransaction();
                return { success: false, error: 'Failed to update wallet balance (version conflict)' };
            }

            // Commit everything atomically
            await session.commitTransaction();

            logger.info('Refund completed', {
                originalTransactionId,
                refundTransactionId: refundTransaction[0]._id,
                companyId,
                amount: originalTransaction.amount,
                newBalance,
            });

            return {
                success: true,
                transactionId: String(refundTransaction[0]._id),
                newBalance,
            };
        } catch (error: any) {
            await session.abortTransaction();
            logger.error('Refund failed', {
                originalTransactionId,
                companyId,
                error: error.message,
            });
            return {
                success: false,
                error: error.message,
            };
        } finally {
            session.endSession();
        }
    }

    /**
     * Get wallet statistics for a company
     */
    static async getWalletStats(
        companyId: string,
        dateRange?: { start: Date; end: Date }
    ): Promise<{
        currentBalance: number;
        totalCredits: number;
        totalDebits: number;
        transactionCount: number;
        topReasons: { reason: string; count: number; total: number }[];
    }> {
        const matchFilter: any = { company: companyId, status: 'completed' };

        if (dateRange) {
            matchFilter.createdAt = {
                $gte: dateRange.start,
                $lte: dateRange.end,
            };
        }

        const [balanceResult, statsResult, reasonsResult] = await Promise.all([
            this.getBalance(companyId),
            WalletTransaction.aggregate([
                { $match: matchFilter },
                {
                    $group: {
                        _id: '$type',
                        total: { $sum: '$amount' },
                        count: { $sum: 1 },
                    },
                },
            ]),
            WalletTransaction.aggregate([
                { $match: matchFilter },
                {
                    $group: {
                        _id: '$reason',
                        count: { $sum: 1 },
                        total: { $sum: '$amount' },
                    },
                },
                { $sort: { count: -1 } },
                { $limit: 5 },
            ]),
        ]);

        let totalCredits = 0;
        let totalDebits = 0;
        let transactionCount = 0;

        statsResult.forEach((stat) => {
            if (stat._id === 'credit' || stat._id === 'refund') {
                totalCredits += stat.total;
            } else {
                totalDebits += stat.total;
            }
            transactionCount += stat.count;
        });

        return {
            currentBalance: balanceResult.balance,
            totalCredits,
            totalDebits,
            transactionCount,
            topReasons: reasonsResult.map((r) => ({
                reason: r._id,
                count: r.count,
                total: r.total,
            })),
        };
    }

    /**
     * Update low balance threshold with audit trail
     * Issue #26: Audit trail for wallet threshold changes
     * Issue #19: Trigger low balance notification if current balance is below new threshold
     */
    static async updateLowBalanceThreshold(
        companyId: string,
        newThreshold: number,
        updatedBy: string
    ): Promise<{ success: boolean; previousThreshold: number; newThreshold: number; isLowBalance: boolean }> {
        // Validate threshold
        if (newThreshold < 0) {
            throw new AppError('Low balance threshold must be non-negative', 'INVALID_THRESHOLD', 400);
        }

        const company = await Company.findById(companyId).select('wallet __v');
        if (!company) {
            throw new AppError('Company not found', ErrorCode.RES_COMPANY_NOT_FOUND, 404);
        }

        const previousThreshold = company.wallet?.lowBalanceThreshold || 500;
        const currentBalance = company.wallet?.balance || 0;

        // Update threshold with optimistic locking (Issue #B from audit)
        const currentVersion = company.__v || 0;
        const updateResult = await Company.findOneAndUpdate(
            { _id: companyId, __v: currentVersion },
            {
                $set: { 'wallet.lowBalanceThreshold': newThreshold },
                $inc: { __v: 1 },
            },
            { new: true }
        );

        if (!updateResult) {
            throw new AppError(
                'Threshold was modified by another process',
                ErrorCode.BIZ_VERSION_CONFLICT,
                409
            );
        }

        // Issue #26: Create audit log entry
        logger.info('Wallet threshold updated', {
            companyId,
            previousThreshold,
            newThreshold,
            updatedBy,
            timestamp: new Date().toISOString(),
            auditType: 'WALLET_THRESHOLD_CHANGE',
        });

        // Issue #19: Check if now in low balance state and trigger notification
        const isLowBalance = currentBalance < newThreshold;
        if (isLowBalance) {
            logger.warn('Low balance alert triggered after threshold update', {
                companyId,
                currentBalance,
                newThreshold,
            });

            // Fire low balance notification event (can be picked up by notification service)
            // This creates a hook point for email/SMS notifications
            this.triggerLowBalanceAlert(companyId, currentBalance, newThreshold);
        }

        return {
            success: true,
            previousThreshold,
            newThreshold,
            isLowBalance,
        };
    }

    /**
     * Trigger low balance alert
     * Issue #19: Hook point for notification integrations
     */
    private static async triggerLowBalanceAlert(
        companyId: string,
        currentBalance: number,
        threshold: number
    ): Promise<void> {
        try {
            // Import email service dynamically
            const EmailService = (await import('../communication/email.service.js')).default;

            // Get company details for email (use settings.notificationEmail)
            const company = await Company.findById(companyId).select('name settings.notificationEmail');
            const notificationEmail = company?.settings?.notificationEmail;

            if (notificationEmail) {
                const subject = '⚠️ Low Wallet Balance Alert';
                const html = `
                    <h2>Low Wallet Balance Alert</h2>
                    <p>Your wallet balance has fallen below the configured threshold.</p>
                    <p><strong>Current Balance:</strong> ₹${currentBalance.toFixed(2)}</p>
                    <p><strong>Threshold:</strong> ₹${threshold.toFixed(2)}</p>
                    <p>Please recharge your wallet to avoid service interruptions.</p>
                    <p>- The Shipcrowd Team</p>
                `;

                await EmailService.sendEmail(notificationEmail, subject, html);
                logger.info('Low balance email notification sent', { companyId, email: notificationEmail });
            } else {
                logger.warn('No notification email configured for company', { companyId });
            }
        } catch (error: any) {
            logger.error('Failed to send low balance notification', {
                companyId,
                error: error.message,
            });
        }
    }
}
