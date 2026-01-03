/**
 * Payout Processing Service
 * 
 * Manages commission payout lifecycle:
 * - Initiate payouts for approved commissions
 * - Process via Razorpay
 * - Handle webhooks
 * - Batch processing
 * - Reconciliation
 */

import mongoose from 'mongoose';
import Payout, { IPayout } from '../../../../infrastructure/database/mongoose/models/payout.model.js';
import CommissionTransaction from '../../../../infrastructure/database/mongoose/models/commission-transaction.model.js';
import SalesRepresentative from '../../../../infrastructure/database/mongoose/models/sales-representative.model.js';
import AuditLog from '../../../../infrastructure/database/mongoose/models/audit-log.model.js';
import RazorpayPayoutProvider from '../../../../infrastructure/payment/razorpay/RazorpayPayoutProvider.js';
import logger from '../../../../shared/logger/winston.logger.js';
import { AppError } from '../../../../shared/errors/index.js';
import eventBus from '../../../../shared/events/eventBus.js';

// DTOs
export interface InitiatePayoutDTO {
    salesRepId: string;
    transactionIds: string[];
    tdsRate?: number;
}

export interface BatchPayoutOptions {
    minThreshold?: number;
    filters?: {
        salesRepIds?: string[];
        territories?: string[];
    };
}

export interface PayoutResult {
    success: boolean;
    payoutId?: string;
    error?: string;
}

export interface BatchPayoutResult {
    total: number;
    success: number;
    failed: number;
    results: Array<{
        salesRepId: string;
        payoutId?: string;
        error?: string;
    }>;
}

export default class PayoutProcessingService {
    private static razorpay = new RazorpayPayoutProvider();

    /**
     * Initiate a payout for a sales representative
     */
    static async initiatePayout(
        data: InitiatePayoutDTO,
        userId: string,
        companyId: string
    ): Promise<IPayout> {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { salesRepId, transactionIds, tdsRate = 0 } = data;

            // Fetch sales rep with bank details
            const salesRep = await SalesRepresentative.findOne({
                _id: new mongoose.Types.ObjectId(salesRepId),
                company: new mongoose.Types.ObjectId(companyId),
                status: 'active',
            }).populate('user');

            if (!salesRep) {
                throw new AppError('Sales representative not found or inactive', 'NOT_FOUND', 404);
            }

            if (!salesRep.bankDetails?.accountNumber) {
                throw new AppError('Bank details not configured for sales rep', 'BAD_REQUEST', 400);
            }

            // Fetch approved transactions
            const transactions = await CommissionTransaction.find({
                _id: { $in: transactionIds.map(id => new mongoose.Types.ObjectId(id)) },
                salesRepresentative: new mongoose.Types.ObjectId(salesRepId),
                company: new mongoose.Types.ObjectId(companyId),
                status: 'approved',
                payoutBatch: null, // Not already in a payout
            }).session(session);

            if (transactions.length === 0) {
                throw new AppError('No eligible transactions found for payout', 'BAD_REQUEST', 400);
            }

            if (transactions.length !== transactionIds.length) {
                throw new AppError(
                    `Only ${transactions.length} of ${transactionIds.length} transactions are eligible`,
                    'BAD_REQUEST',
                    400
                );
            }

            // Calculate amounts
            const totalAmount = transactions.reduce((sum, t) => sum + t.finalAmount, 0);
            const tdsDeducted = tdsRate > 0 ? (totalAmount * tdsRate) / 100 : 0;
            const netAmount = totalAmount - tdsDeducted;

            if (netAmount <= 0) {
                throw new AppError('Net payout amount must be positive', 'BAD_REQUEST', 400);
            }

            // Create payout record
            const payout = new Payout({
                company: new mongoose.Types.ObjectId(companyId),
                salesRepresentative: new mongoose.Types.ObjectId(salesRepId),
                commissionTransactions: transactions.map(t => t._id),
                totalAmount,
                tdsDeducted,
                netAmount,
                status: 'pending',
                metadata: {
                    initiatedBy: userId,
                    transactionCount: transactions.length,
                },
            });

            await payout.save({ session });

            // Update transactions to mark them as part of this payout
            await CommissionTransaction.updateMany(
                { _id: { $in: transactions.map(t => t._id) } },
                { payoutBatch: payout._id },
                { session }
            );

            if (!salesRep.razorpayFundAccountId) {
                const fundAccount = await this.razorpay.createFundAccount(
                    {
                        accountNumber: salesRep.bankDetails.accountNumber,
                        ifscCode: salesRep.bankDetails.ifscCode,
                        accountHolderName: salesRep.bankDetails.accountHolderName,
                    },
                    String(salesRep._id),
                    salesRep.razorpayContactId
                );

                salesRep.razorpayFundAccountId = fundAccount.id;
                salesRep.razorpayContactId = fundAccount.contact_id;
                await salesRep.save({ session });
            }

            // Initiate Razorpay payout
            try {
                payout.status = 'processing';
                await payout.save({ session });

                const razorpayPayout = await this.razorpay.createPayout({
                    fundAccountId: salesRep.razorpayFundAccountId!,
                    amount: netAmount,
                    currency: 'INR',
                    mode: netAmount > 200000 ? 'NEFT' : 'IMPS', // Auto-select mode
                    purpose: 'payout',
                    referenceId: payout.payoutId,
                    narration: `Commission ${payout.payoutId}`,
                    notes: {
                        payoutId: payout.payoutId,
                        salesRepId: String(salesRep._id),
                        transactionCount: String(transactions.length),
                    },
                });

                payout.razorpay.payoutId = razorpayPayout.id;
                payout.razorpay.fundAccountId = salesRep.razorpayFundAccountId;
                payout.razorpay.status = razorpayPayout.status;
                await payout.save({ session });

                await session.commitTransaction();

                // Audit log
                await AuditLog.create({
                    userId: new mongoose.Types.ObjectId(userId),
                    action: 'payout.initiated',
                    resource: 'Payout',
                    resourceId: payout._id,
                    company: new mongoose.Types.ObjectId(companyId),
                    details: {
                        salesRepId,
                        amount: netAmount,
                        transactionCount: transactions.length,
                        razorpayPayoutId: razorpayPayout.id,
                    },
                });

                // Emit event
                eventBus.emitEvent('payout.initiated', {
                    transactionId: String(payout._id),
                    salesRepId,
                    companyId,
                    amount: netAmount,
                });

                logger.info('Payout initiated successfully', {
                    payoutId: payout.payoutId,
                    razorpayPayoutId: razorpayPayout.id,
                    amount: netAmount,
                });

                return payout;
            } catch (razorpayError: any) {
                await session.abortTransaction();
                payout.status = 'failed';
                payout.razorpay.failureReason = razorpayError.message;
                await payout.save();

                throw new AppError(
                    `Failed to initiate Razorpay payout: ${razorpayError.message}`,
                    'PAYMENT_FAILED',
                    500
                );
            }
        } catch (error) {
            await session.abortTransaction();
            logger.error('Failed to initiate payout', error);
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Process batch payouts for multiple sales representatives
     */
    static async processBatchPayouts(
        options: BatchPayoutOptions,
        userId: string,
        companyId: string
    ): Promise<BatchPayoutResult> {
        const result: BatchPayoutResult = {
            total: 0,
            success: 0,
            failed: 0,
            results: [],
        };

        try {
            // Build query for eligible transactions
            const query: any = {
                company: new mongoose.Types.ObjectId(companyId),
                status: 'approved',
                payoutBatch: null,
            };

            if (options.minThreshold) {
                query.finalAmount = { $gte: options.minThreshold };
            }

            // Aggregate by sales rep
            const aggregation = await CommissionTransaction.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: '$salesRepresentative',
                        transactions: { $push: '$_id' },
                        totalAmount: { $sum: '$finalAmount' },
                        count: { $sum: 1 },
                    },
                },
                {
                    $match: {
                        totalAmount: { $gte: options.minThreshold || 100 },
                    },
                },
            ]);

            result.total = aggregation.length;

            // Process each sales rep
            for (const item of aggregation) {
                try {
                    await this.initiatePayout(
                        {
                            salesRepId: String(item._id),
                            transactionIds: item.transactions.map((id: any) => String(id)),
                        },
                        userId,
                        companyId
                    );
                    result.success++;
                    result.results.push({
                        salesRepId: String(item._id),
                    });
                } catch (error: any) {
                    result.failed++;
                    result.results.push({
                        salesRepId: String(item._id),
                        error: error.message,
                    });
                    logger.error(`Batch payout failed for sales rep ${item._id}`, error);
                }
            }

            logger.info('Batch payout processing completed', {
                total: result.total,
                success: result.success,
                failed: result.failed,
            });

            return result;
        } catch (error) {
            logger.error('Batch payout processing failed', error);
            throw error;
        }
    }

    /**
     * Handle Razorpay webhook event
     */
    static async handleWebhook(
        payload: any,
        signature: string,
        webhookSecret: string
    ): Promise<void> {
        try {
            const event = await this.razorpay.handleWebhook(payload, signature, webhookSecret);

            if (event.event === 'payout.processed') {
                await this.handlePayoutProcessed(event.payload.payout.entity);
            } else if (event.event === 'payout.failed' || event.event === 'payout.rejected') {
                await this.handlePayoutFailed(event.payload.payout.entity);
            }
        } catch (error) {
            logger.error('Webhook handling failed', error);
            throw error;
        }
    }

    /**
     * Handle successful payout
     */
    private static async handlePayoutProcessed(razorpayPayout: any): Promise<void> {
        try {
            const payout = await Payout.findByRazorpayPayoutId(razorpayPayout.id);

            if (!payout) {
                logger.warn('Payout not found for Razorpay payout', {
                    razorpayPayoutId: razorpayPayout.id,
                });
                return;
            }

            await payout.markCompleted({
                payoutId: razorpayPayout.id,
                utr: razorpayPayout.utr,
                status: razorpayPayout.status,
            });

            // Update commission transactions to 'paid' status
            await CommissionTransaction.updateMany(
                { _id: { $in: payout.commissionTransactions } },
                {
                    status: 'paid',
                    paidBy: payout.company,
                    paidAt: new Date(),
                }
            );

            // Emit event
            eventBus.emitEvent('payout.completed', {
                transactionId: String(payout._id),
                salesRepId: String(payout.salesRepresentative),
                companyId: String(payout.company),
                amount: payout.netAmount,
            });

            logger.info('Payout marked as completed', {
                payoutId: payout.payoutId,
                razorpayPayoutId: razorpayPayout.id,
                utr: razorpayPayout.utr,
            });
        } catch (error) {
            logger.error('Failed to handle payout processed', error);
        }
    }

    /**
     * Handle failed payout
     */
    private static async handlePayoutFailed(razorpayPayout: any): Promise<void> {
        try {
            const payout = await Payout.findByRazorpayPayoutId(razorpayPayout.id);

            if (!payout) {
                logger.warn('Payout not found for Razorpay payout', {
                    razorpayPayoutId: razorpayPayout.id,
                });
                return;
            }

            await payout.markFailed(razorpayPayout.failure_reason || 'Unknown error');

            // Emit event
            eventBus.emitEvent('payout.failed', {
                transactionId: String(payout._id),
                salesRepId: String(payout.salesRepresentative),
                companyId: String(payout.company),
                amount: payout.netAmount,
            });

            logger.error('Payout marked as failed', {
                payoutId: payout.payoutId,
                razorpayPayoutId: razorpayPayout.id,
                reason: razorpayPayout.failure_reason,
            });
        } catch (error) {
            logger.error('Failed to handle payout failed', error);
        }
    }

    /**
     * Get payout by ID
     */
    static async getPayout(payoutId: string, companyId: string): Promise<IPayout> {
        const payout = await Payout.findOne({
            _id: new mongoose.Types.ObjectId(payoutId),
            company: new mongoose.Types.ObjectId(companyId),
        })
            .populate('salesRepresentative', 'employeeId user')
            .populate('commissionTransactions', 'order finalAmount');

        if (!payout) {
            throw new AppError('Payout not found', 'NOT_FOUND', 404);
        }

        return payout;
    }

    /**
     * List payouts with filters
     */
    static async listPayouts(
        companyId: string,
        filters: {
            status?: string;
            salesRepId?: string;
            startDate?: Date;
            endDate?: Date;
        },
        pagination: { page: number; limit: number }
    ): Promise<{ data: IPayout[]; total: number }> {
        const query: any = {
            company: new mongoose.Types.ObjectId(companyId),
        };

        if (filters.status) {
            query.status = filters.status;
        }

        if (filters.salesRepId) {
            query.salesRepresentative = new mongoose.Types.ObjectId(filters.salesRepId);
        }

        if (filters.startDate || filters.endDate) {
            query.payoutDate = {};
            if (filters.startDate) query.payoutDate.$gte = filters.startDate;
            if (filters.endDate) query.payoutDate.$lte = filters.endDate;
        }

        const [data, total] = await Promise.all([
            Payout.find(query)
                .populate('salesRepresentative', 'employeeId user')
                .skip((pagination.page - 1) * pagination.limit)
                .limit(pagination.limit)
                .sort({ payoutDate: -1 }),
            Payout.countDocuments(query),
        ]);

        return { data, total };
    }

    /**
     * Retry a failed payout
     */
    static async retryPayout(
        payoutId: string,
        userId: string,
        companyId: string
    ): Promise<IPayout> {
        const payout = await this.getPayout(payoutId, companyId);

        if (payout.status !== 'failed') {
            throw new AppError('Only failed payouts can be retried', 'BAD_REQUEST', 400);
        }

        await payout.retry();

        // Re-initiate via Razorpay
        const salesRep = await SalesRepresentative.findById(payout.salesRepresentative);

        if (!salesRep || !salesRep.razorpayFundAccountId) {
            throw new AppError('Sales representative or fund account not found', 'NOT_FOUND', 404);
        }

        const razorpayPayout = await this.razorpay.createPayout({
            fundAccountId: salesRep.razorpayFundAccountId,
            amount: payout.netAmount,
            currency: 'INR',
            mode: payout.netAmount > 200000 ? 'NEFT' : 'IMPS',
            purpose: 'payout',
            referenceId: payout.payoutId,
            narration: `Commission ${payout.payoutId} (Retry)`,
        });

        payout.status = 'processing';
        payout.razorpay.payoutId = razorpayPayout.id;
        payout.razorpay.status = razorpayPayout.status;
        await payout.save();

        logger.info('Payout retried', {
            payoutId: payout.payoutId,
            razorpayPayoutId: razorpayPayout.id,
        });

        return payout;
    }

    /**
     * Cancel a payout (only if pending/queued in Razorpay)
     */
    static async cancelPayout(
        payoutId: string,
        userId: string,
        companyId: string
    ): Promise<IPayout> {
        const payout = await this.getPayout(payoutId, companyId);

        if (!['pending', 'processing'].includes(payout.status)) {
            throw new AppError('Only pending/processing payouts can be cancelled', 'BAD_REQUEST', 400);
        }

        if (payout.razorpay.payoutId) {
            await this.razorpay.cancelPayout(payout.razorpay.payoutId);
        }

        payout.status = 'cancelled';
        payout.cancelledAt = new Date();
        await payout.save();

        // Release commission transactions
        await CommissionTransaction.updateMany(
            { _id: { $in: payout.commissionTransactions } },
            { $unset: { payoutBatch: 1 } }
        );

        logger.info('Payout cancelled', { payoutId: payout.payoutId });

        return payout;
    }
}
