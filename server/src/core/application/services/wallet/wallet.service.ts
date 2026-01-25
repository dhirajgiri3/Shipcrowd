/**
 * WalletService
 *
 * Manages company wallet operations including balance checks, credits, debits,
 * and transaction history. Uses optimistic locking to prevent race conditions.
 * 
 * BUSINESS RULES:
 * ===============
 * 1. Optimistic Locking (Version Control)
 *    - Condition: Every wallet update
 *    - Action: Check __v field, increment on success
 *    - Reason: Prevent lost updates in concurrent transactions
 * 
 * 2. Insufficient Balance Protection
 *    - Condition: Debit attempt when balance < amount
 *    - Action: Throw error, rollback transaction
 *    - Reason: Prevent negative wallet balance
 * 
 * 3. Low Balance Alerts
 *    - Condition: Balance crosses below threshold
 *    - Action: Send email notification (non-blocking)
 *    - Reason: Proactive customer service
 * 
 * 4. Transaction Atomicity
 *    - Condition: All wallet operations
 *    - Action: Use MongoDB sessions/transactions
 *    - Reason: Ensure balance and transaction records stay in sync
 * 
 * 5. Refund Protection
 *    - Condition: Refund attempt for transaction
 *    - Action: Mark original as 'reversed' before processing refund
 *    - Reason: Prevent duplicate refunds
 * 
 * ERROR HANDLING:
 * ==============
 * Expected Errors:
 * - AppError (404): Company not found
 * - AppError (400): Invalid amount (negative/zero)
 * - AppError (400): Insufficient balance for debit
 * - AppError (409): Version conflict (concurrent update)
 * 
 * Recovery Strategy:
 * - Version Conflict: Retry with exponential backoff (max 3 retries)
 * - Insufficient Balance: Return error, caller handles (e.g., mark paymentPending)
 * - Invalid Amount: Log and return error immediately
 * - Company Not Found: Throw error, caller must handle
 * 
 * CONCURRENCY HANDLING:
 * ====================
 * - TOCTOU Prevention: Balance check inside transaction
 * - Optimistic Locking: Version field (__v) prevents lost updates
 * - Retry Logic: Exponential backoff with jitter on conflicts
 * - External Session Support: Allows transaction isolation with calling service
 * 
 * DEPENDENCIES:
 * ============
 * Internal:
 * - Company Model: Wallet balance storage
 * - WalletTransaction Model: Transaction history
 * - Logger: Winston for structured logging
 * - EmailService: Low balance notifications
 * 
 * Used By:
 * - WeightDisputeResolutionService: Refunds/deductions
 * - CODRemittanceService: Remittance credits
 * - RTOService: RTO charge debits
 * - ShippingService: Shipping cost debits
 * - PaymentService: Wallet recharges
 * 
 * PERFORMANCE:
 * ===========
 * - Transaction Time: <50ms for credit/debit (single document update)
 * - Retry Overhead: +100-400ms on version conflicts (rare)
 * - Aggregation Queries: <200ms for transaction history (indexed)
 * - Optimization: Uses lean() queries where possible
 * 
 * TESTING:
 * =======
 * Unit Tests: tests/unit/services/wallet/wallet.service.test.ts
 * Coverage: TBD
 * 
 * Critical Test Cases:
 * - Concurrent debits (version conflict handling)
 * - Insufficient balance handling
 * - Refund with duplicate prevention
 * - Low balance alert triggering
 * - Transaction rollback on errors
 * - External session integration
 * 
 * Business Impact: 
 * - Critical for all financial operations
 * - Used in 90%+ of shipment lifecycle events
 * - Must maintain 99.9% consistency
 */

import mongoose from 'mongoose';
import { Company } from '../../../../infrastructure/database/mongoose/models';
import {
    WalletTransaction,
    IWalletTransaction,
    TransactionType,
    TransactionReason,
} from '../../../../infrastructure/database/mongoose/models';
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

    /**
     * Get 7-day cash flow forecast
     * Analyzes past 30 days to project future inflows (COD) and outflows (shipping)
     * Powers the CashFlowForecast dashboard component
     */
    static async getCashFlowForecast(companyId: string): Promise<{
        forecast: Array<{
            date: string;
            inflows: number;
            outflows: number;
            netChange: number;
            projectedBalance: number;
        }>;
        summary: {
            currentBalance: number;
            projectedBalance7Days: number;
            totalInflows: number;
            totalOutflows: number;
            lowBalanceWarning: boolean;
            warningDate: string | null;
        };
        averages: {
            dailyInflow: number;
            dailyOutflow: number;
        };
    }> {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Get current balance
        const balanceData = await this.getBalance(companyId);
        const currentBalance = balanceData.balance;
        const lowBalanceThreshold = balanceData.lowBalanceThreshold;

        // Analyze past 30 days of transactions
        const transactions = await WalletTransaction.aggregate([
            {
                $match: {
                    company: new mongoose.Types.ObjectId(companyId),
                    status: 'completed',
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    credits: {
                        $sum: {
                            $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0]
                        }
                    },
                    debits: {
                        $sum: {
                            $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0]
                        }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Calculate daily averages
        // Calculate daily averages by day of week
        const dayStats = transactions.reduce((acc, t) => {
            const date = new Date(t._id);
            const dayOfWeek = date.getDay(); // 0-6 (Sun-Sat)

            if (!acc[dayOfWeek]) {
                acc[dayOfWeek] = { credits: 0, debits: 0, count: 0 };
            }

            acc[dayOfWeek].credits += t.credits;
            acc[dayOfWeek].debits += t.debits;
            acc[dayOfWeek].count++;
            return acc;
        }, {} as Record<number, { credits: number; debits: number; count: number }>);

        const daysWithData = transactions.length || 1;
        const totalCredits = transactions.reduce((sum, t) => sum + t.credits, 0);
        const totalDebits = transactions.reduce((sum, t) => sum + t.debits, 0);
        const dailyInflow = totalCredits / Math.min(daysWithData, 30);
        const dailyOutflow = totalDebits / Math.min(daysWithData, 30);

        // Project next 7 days (including today)
        const forecast: Array<{
            date: string;
            inflows: number;
            outflows: number;
            netChange: number;
            projectedBalance: number;
        }> = [];

        let runningBalance = currentBalance;
        let totalProjectedInflows = 0;
        let totalProjectedOutflows = 0;
        let warningDate: string | null = null;

        // Loop 0 to 6 (7 days starting Today), matching UI EXPECTATION
        for (let i = 0; i < 7; i++) {
            const forecastDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
            const dateStr = forecastDate.toISOString().split('T')[0];
            const dayOfWeek = forecastDate.getDay();

            // Use day-specific average if available, otherwise fallback to global average
            const dayStat = dayStats[dayOfWeek];
            const projectedInflow = Math.round(dayStat ? dayStat.credits / dayStat.count : dailyInflow);
            const projectedOutflow = Math.round(dayStat ? dayStat.debits / dayStat.count : dailyOutflow);

            const netChange = projectedInflow - projectedOutflow;
            runningBalance += netChange;

            totalProjectedInflows += projectedInflow;
            totalProjectedOutflows += projectedOutflow;

            /* Check if balance will drop below threshold (only future warning) */
            if (!warningDate && runningBalance < lowBalanceThreshold && i > 0) {
                warningDate = dateStr;
            }

            forecast.push({
                date: dateStr,
                inflows: projectedInflow,
                outflows: projectedOutflow,
                netChange,
                projectedBalance: Math.max(0, runningBalance)
            });
        }

        return {
            forecast,
            summary: {
                currentBalance,
                projectedBalance7Days: Math.max(0, runningBalance),
                totalInflows: totalProjectedInflows,
                totalOutflows: totalProjectedOutflows,
                lowBalanceWarning: warningDate !== null,
                warningDate
            },
            averages: {
                dailyInflow: Math.round(dailyInflow),
                dailyOutflow: Math.round(dailyOutflow)
            }
        };
    }

    /**
     * Calculate projected outflows for next N days based on past 30 days
     * Used by Available Balance calculation to estimate future spending
     * 
     * @param companyId - Company ID
     * @param days - Number of days to project (default: 7)
     * @returns Estimated spending for next N days
     */
    static async getProjectedOutflows(
        companyId: string,
        days: number = 7
    ): Promise<number> {
        try {
            const last30Days = new Date();
            last30Days.setDate(last30Days.getDate() - 30);

            // Get all debit transactions from last 30 days
            const debits = await WalletTransaction.find({
                companyId: new mongoose.Types.ObjectId(companyId),
                type: 'debit',
                createdAt: { $gte: last30Days },
            })
                .select('amount createdAt')
                .lean() as unknown as Array<{ amount: number; createdAt: Date }>;

            // Handle edge case: new sellers with no transaction history
            if (!debits || debits.length === 0) {
                logger.info('No transaction history found for projected outflows', {
                    companyId,
                    days,
                });
                return 0;
            }

            // ✅ IMPROVED: Calculate actual days of data (handle new sellers with <30 days history)
            const oldestTx = debits.reduce((oldest, tx) =>
                new Date(tx.createdAt) < new Date(oldest.createdAt) ? tx : oldest
            );

            const actualDays = Math.max(
                1,
                Math.floor((Date.now() - new Date(oldestTx.createdAt).getTime()) / (1000 * 60 * 60 * 24))
            );

            // Calculate total outflows
            const totalOutflows = debits.reduce(
                (sum, tx) => sum + Math.abs(tx.amount),
                0
            );

            // Calculate average daily outflow using ACTUAL data range (not fixed 30 days)
            const avgDailyOutflow = totalOutflows / actualDays;

            // Project for next N days
            const projected = avgDailyOutflow * days;

            logger.info('Calculated projected outflows', {
                companyId,
                days,
                actualDays, // Log actual data range
                totalOutflows,
                avgDailyOutflow,
                projected,
                transactionCount: debits.length,
            });

            return Math.round(projected); // Round to nearest rupee
        } catch (error) {
            logger.error('Error calculating projected outflows', {
                companyId,
                days,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            // Return 0 instead of throwing - don't block Available Balance calculation
            return 0;
        }
    }
}
