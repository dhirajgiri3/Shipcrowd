/**
 * Commission Approval Service
 * 
 * Handles commission approval workflow:
 * - Approve/reject individual transactions
 * - Bulk approve/reject
 * - Add adjustments (bonuses, penalties, corrections)
 */

import mongoose from 'mongoose';
import {
    CommissionTransaction,
    ICommissionTransaction,
    CommissionAdjustment,
    AuditLog
} from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';
import { AppError } from '../../../../shared/errors/index';

// DTOs
export interface ApproveTransactionDTO {
    transactionId: string;
    notes?: string;
}

export interface RejectTransactionDTO {
    transactionId: string;
    reason: string;
}

export interface BulkApproveDTO {
    transactionIds: string[];
}

export interface BulkRejectDTO {
    transactionIds: string[];
    reason: string;
}

export interface AddAdjustmentDTO {
    transactionId: string;
    amount: number;
    reason: string;
    adjustmentType: 'bonus' | 'penalty' | 'correction' | 'dispute' | 'other';
}

export interface BulkOperationResult {
    success: number;
    failed: number;
    errors: Array<{ id: string; error: string }>;
}

export default class CommissionApprovalService {
    /**
     * Approve a commission transaction
     */
    static async approveTransaction(
        data: ApproveTransactionDTO,
        userId: string,
        companyId: string
    ): Promise<ICommissionTransaction> {
        try {
            const { transactionId, notes } = data;

            // Find transaction with optimistic locking
            const transaction = await CommissionTransaction.findOne({
                _id: new mongoose.Types.ObjectId(transactionId),
                company: new mongoose.Types.ObjectId(companyId),
            });

            if (!transaction) {
                throw new AppError('Commission transaction not found', 'NOT_FOUND', 404);
            }

            // Validate status
            if (transaction.status !== 'pending') {
                throw new AppError(
                    `Cannot approve transaction with status ${transaction.status}`,
                    'BAD_REQUEST',
                    400
                );
            }

            // Update transaction
            transaction.status = 'approved';
            transaction.approvedBy = new mongoose.Types.ObjectId(userId);
            transaction.approvedAt = new Date();

            if (notes && transaction.metadata) {
                transaction.metadata.approvalNotes = notes;
            } else if (notes) {
                transaction.metadata = { approvalNotes: notes };
            }

            await transaction.save();

            // Create audit log
            await AuditLog.create({
                userId: new mongoose.Types.ObjectId(userId),
                action: 'commission.approved',
                resource: 'CommissionTransaction',
                resourceId: transaction._id,
                company: new mongoose.Types.ObjectId(companyId),
                details: {
                    amount: transaction.finalAmount,
                    salesRepId: transaction.salesRepresentative,
                    notes,
                },
            });

            logger.info(
                `Commission approved: ${transactionId} by user ${userId}, amount: ${transaction.finalAmount}`
            );

            return transaction;
        } catch (error) {
            logger.error('Error approving commission:', error);
            throw error;
        }
    }

    /**
     * Reject a commission transaction
     */
    static async rejectTransaction(
        data: RejectTransactionDTO,
        userId: string,
        companyId: string
    ): Promise<ICommissionTransaction> {
        try {
            const { transactionId, reason } = data;

            const transaction = await CommissionTransaction.findOne({
                _id: new mongoose.Types.ObjectId(transactionId),
                company: new mongoose.Types.ObjectId(companyId),
            });

            if (!transaction) {
                throw new AppError('Commission transaction not found', 'NOT_FOUND', 404);
            }

            if (transaction.status !== 'pending') {
                throw new AppError(
                    `Cannot reject transaction with status ${transaction.status}`,
                    'BAD_REQUEST',
                    400
                );
            }

            // Update transaction
            transaction.status = 'rejected';
            transaction.rejectedBy = new mongoose.Types.ObjectId(userId);
            transaction.rejectedAt = new Date();
            transaction.rejectionReason = reason;

            await transaction.save();

            // Create audit log
            await AuditLog.create({
                userId: new mongoose.Types.ObjectId(userId),
                action: 'commission.rejected',
                resource: 'CommissionTransaction',
                resourceId: transaction._id,
                company: new mongoose.Types.ObjectId(companyId),
                details: {
                    reason,
                    salesRepId: transaction.salesRepresentative,
                },
            });

            logger.info(`Commission rejected: ${transactionId} by user ${userId}, reason: ${reason}`);

            return transaction;
        } catch (error) {
            logger.error('Error rejecting commission:', error);
            throw error;
        }
    }

    /**
     * Bulk approve multiple transactions
     */
    static async bulkApprove(
        data: BulkApproveDTO,
        userId: string,
        companyId: string
    ): Promise<BulkOperationResult> {
        const result: BulkOperationResult = {
            success: 0,
            failed: 0,
            errors: [],
        };

        for (const transactionId of data.transactionIds) {
            try {
                await this.approveTransaction({ transactionId }, userId, companyId);
                result.success++;
            } catch (error: any) {
                result.failed++;
                result.errors.push({
                    id: transactionId,
                    error: error.message || 'Unknown error',
                });
                logger.error(`Bulk approve failed for transaction ${transactionId}:`, error);
            }
        }

        // Create summary audit log
        await AuditLog.create({
            userId: new mongoose.Types.ObjectId(userId),
            action: 'commission.bulk_approved',
            resource: 'CommissionTransaction',
            company: new mongoose.Types.ObjectId(companyId),
            details: {
                total: data.transactionIds.length,
                success: result.success,
                failed: result.failed,
            },
        });

        logger.info(`Bulk approve completed: ${result.success} succeeded, ${result.failed} failed`);

        return result;
    }

    /**
     * Bulk reject multiple transactions
     */
    static async bulkReject(
        data: BulkRejectDTO,
        userId: string,
        companyId: string
    ): Promise<BulkOperationResult> {
        const result: BulkOperationResult = {
            success: 0,
            failed: 0,
            errors: [],
        };

        for (const transactionId of data.transactionIds) {
            try {
                await this.rejectTransaction(
                    { transactionId, reason: data.reason },
                    userId,
                    companyId
                );
                result.success++;
            } catch (error: any) {
                result.failed++;
                result.errors.push({
                    id: transactionId,
                    error: error.message || 'Unknown error',
                });
                logger.error(`Bulk reject failed for transaction ${transactionId}:`, error);
            }
        }

        // Create summary audit log
        await AuditLog.create({
            userId: new mongoose.Types.ObjectId(userId),
            action: 'commission.bulk_rejected',
            resource: 'CommissionTransaction',
            company: new mongoose.Types.ObjectId(companyId),
            details: {
                total: data.transactionIds.length,
                success: result.success,
                failed: result.failed,
                reason: data.reason,
            },
        });

        logger.info(`Bulk reject completed: ${result.success} succeeded, ${result.failed} failed`);

        return result;
    }

    /**
     * Add an adjustment to a transaction
     */
    static async addAdjustment(
        data: AddAdjustmentDTO,
        userId: string,
        companyId: string
    ): Promise<ICommissionTransaction> {
        try {
            const { transactionId, amount, reason, adjustmentType } = data;

            //  Find transaction
            const transaction = await CommissionTransaction.findOne({
                _id: new mongoose.Types.ObjectId(transactionId),
                company: new mongoose.Types.ObjectId(companyId),
            });

            if (!transaction) {
                throw new AppError('Commission transaction not found', 'NOT_FOUND', 404);
            }

            // Can only adjust pending or approved transactions
            if (!['pending', 'approved'].includes(transaction.status)) {
                throw new AppError(
                    `Cannot adjust transaction with status ${transaction.status}`,
                    'BAD_REQUEST',
                    400
                );
            }

            // Create adjustment record
            const adjustment = await CommissionAdjustment.create({
                commissionTransaction: transaction._id,
                company: new mongoose.Types.ObjectId(companyId),
                amount,
                reason,
                adjustmentType,
                adjustedBy: new mongoose.Types.ObjectId(userId),
                status: 'pending', // Will need approval
            });

            // Add to transaction's adjustments array
            transaction.adjustments.push(adjustment._id as any);

            // Recalculate final amount (sum approved adjustments)
            const totalAdjustment = await CommissionAdjustment.getTotalAdjustment(String(transaction._id));
            transaction.finalAmount = transaction.calculatedAmount + totalAdjustment + amount; // Include pending adjustment

            // Ensure final amount is not negative
            if (transaction.finalAmount < 0) {
                transaction.finalAmount = 0;
            }

            await transaction.save();

            // Create audit log
            await AuditLog.create({
                userId: new mongoose.Types.ObjectId(userId),
                action: 'commission.adjustment_added',
                resource: 'CommissionTransaction',
                resourceId: transaction._id,
                company: new mongoose.Types.ObjectId(companyId),
                details: {
                    adjustmentId: adjustment._id,
                    amount,
                    adjustmentType,
                    reason,
                },
            });

            logger.info(
                `Adjustment added to transaction ${transactionId}: ${amount} (${adjustmentType})`
            );

            // Return populated transaction
            return CommissionTransaction.findById(transaction._id)
                .populate('adjustments')
                .then((t) => t!) as Promise<ICommissionTransaction>;
        } catch (error) {
            logger.error('Error adding adjustment:', error);
            throw error;
        }
    }

    /**
     * Get pending transactions for approval
     */
    static async getPendingTransactions(
        companyId: string,
        filters: { salesRepId?: string; minAmount?: number },
        pagination: { page: number; limit: number }
    ): Promise<{ data: ICommissionTransaction[]; total: number }> {
        const query: any = {
            company: new mongoose.Types.ObjectId(companyId),
            status: 'pending',
        };

        if (filters.salesRepId) {
            query.salesRepresentative = new mongoose.Types.ObjectId(filters.salesRepId);
        }

        if (filters.minAmount) {
            query.finalAmount = { $gte: filters.minAmount };
        }

        const [data, total] = await Promise.all([
            CommissionTransaction.find(query)
                .populate('salesRepresentative', 'employeeId user')
                .populate('order', 'orderNumber totals')
                .populate('commissionRule', 'name ruleType')
                .skip((pagination.page - 1) * pagination.limit)
                .limit(pagination.limit)
                .sort({ calculatedAt: -1 })
                .lean(),
            CommissionTransaction.countDocuments(query),
        ]);

        return { data: data as ICommissionTransaction[], total };
    }

    /**
     * Get approved transactions ready for payout
     */
    static async getReadyForPayout(
        companyId: string,
        salesRepId?: string
    ): Promise<ICommissionTransaction[]> {
        const query: any = {
            company: new mongoose.Types.ObjectId(companyId),
            status: 'approved',
            payoutBatch: null, // Not yet included in a payout
        };

        if (salesRepId) {
            query.salesRepresentative = new mongoose.Types.ObjectId(salesRepId);
        }

        return CommissionTransaction.find(query)
            .populate('salesRepresentative', 'employeeId bankDetails')
            .sort({ approvedAt: 1 })
            .lean() as Promise<ICommissionTransaction[]>;
    }
}
