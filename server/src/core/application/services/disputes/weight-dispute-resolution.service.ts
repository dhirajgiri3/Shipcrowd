/**
 * WeightDisputeResolutionService
 * 
 * Handles weight dispute resolution workflow:
 * 1. Seller submits evidence (photos, documents)
 * 2. Admin reviews and resolves disputes
 * 3. Auto-resolves disputes after 7 days of inactivity (favors ShipCrowd)
 * 4. Processes financial settlement via wallet
 * 
 * Business Impact:
 * - 60%+ seller response rate target
 * - 24-hour financial settlement
 * - Automated resolution reduces manual work
 */

import mongoose from 'mongoose';
import WeightDispute from '../../../../infrastructure/database/mongoose/models/logistics/shipping/exceptions/weight-dispute.model';
import Shipment from '../../../../infrastructure/database/mongoose/models/logistics/shipping/core/shipment.model';
import WalletService from '../wallet/wallet.service';
import logger from '../../../../shared/logger/winston.logger';
import { AppError, NotFoundError, AuthorizationError, ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';

// Type definitions
interface SellerEvidenceDTO {
    photos?: string[];
    documents?: string[];
    notes?: string;
}

interface DisputeResolutionDTO {
    outcome: 'seller_favor' | 'shipcrowd_favor' | 'split' | 'waived';
    adjustedWeight?: {
        value: number;
        unit: 'kg' | 'g';
    };
    refundAmount?: number;
    deductionAmount?: number;
    reasonCode: string;
    notes: string;
}

class WeightDisputeResolutionService {
    /**
     * Seller submits response/evidence to dispute
     * 
     * @param disputeId - WeightDispute ID
     * @param companyId - Company submitting evidence (authorization check)
     * @param evidence - Photos, documents, notes
     * @returns Updated dispute
     */
    async submitSellerResponse(
        disputeId: string,
        companyId: string,
        evidence: SellerEvidenceDTO
    ): Promise<any> {
        try {
            const dispute = await WeightDispute.findById(disputeId);

            if (!dispute) {
                throw new NotFoundError('Dispute', ErrorCode.BIZ_NOT_FOUND);
            }

            // Authorization check
            if (dispute.companyId.toString() !== companyId) {
                throw new AuthorizationError('Not authorized to respond to this dispute');
            }

            // Status validation
            if (dispute.status !== 'pending') {
                throw new AppError(
                    `Cannot submit evidence for dispute in status: ${dispute.status}`,
                    ErrorCode.BIZ_INVALID_STATE,
                    400
                );
            }

            // Update dispute with evidence
            dispute.evidence = {
                sellerPhotos: evidence.photos || [],
                sellerDocuments: evidence.documents || [],
                submittedAt: new Date(),
                notes: evidence.notes || '',
            };

            dispute.status = 'under_review';

            // Add timeline entry
            dispute.timeline.push({
                status: 'under_review',
                timestamp: new Date(),
                actor: new mongoose.Types.ObjectId(companyId),
                action: 'Seller submitted evidence for review',
                notes: `${evidence.photos?.length || 0} photos, ${evidence.documents?.length || 0} documents`,
            });

            await dispute.save();

            // Update shipment dispute status
            await Shipment.findByIdAndUpdate(dispute.shipmentId, {
                'weightDispute.status': 'under_review',
            });

            logger.info('Seller submitted dispute evidence', {
                disputeId: dispute.disputeId,
                companyId,
                photoCount: evidence.photos?.length || 0,
                docCount: evidence.documents?.length || 0,
            });

            // TODO: Notify admin team for review (Phase 5)
            // await this.notificationService.sendInternalAlertForReview('weight_dispute_needs_review', dispute);

            return dispute;
        } catch (error) {
            logger.error('Error submitting seller evidence', {
                disputeId,
                companyId,
                error: error instanceof Error ? error.message : error,
            });
            throw error;
        }
    }

    /**
     * Admin reviews and resolves dispute
     * 
     * @param disputeId - WeightDispute ID
     * @param adminId - Admin user ID
     * @param resolution - Resolution details
     * @returns Updated dispute
     */
    async resolveDispute(
        disputeId: string,
        adminId: string | 'system',
        resolution: DisputeResolutionDTO
    ): Promise<any> {
        try {
            const dispute = await WeightDispute.findById(disputeId);

            if (!dispute) {
                throw new NotFoundError('Dispute', ErrorCode.BIZ_NOT_FOUND);
            }

            // Validate resolution outcome
            const validOutcomes = ['seller_favor', 'shipcrowd_favor', 'split', 'waived'];
            if (!validOutcomes.includes(resolution.outcome)) {
                throw new ValidationError(`Invalid resolution outcome: ${resolution.outcome}`);
            }

            // Set resolution
            dispute.resolution = {
                outcome: resolution.outcome,
                adjustedWeight: resolution.adjustedWeight,
                refundAmount: resolution.refundAmount || 0,
                deductionAmount: resolution.deductionAmount || 0,
                reasonCode: resolution.reasonCode,
                resolvedAt: new Date(),
                resolvedBy: adminId === 'system' ? 'system' : new mongoose.Types.ObjectId(adminId),
                notes: resolution.notes,
            };

            dispute.status = adminId === 'system' ? 'auto_resolved' : 'manual_resolved';

            // Add timeline entry
            dispute.timeline.push({
                status: dispute.status,
                timestamp: new Date(),
                actor: adminId === 'system' ? 'system' : new mongoose.Types.ObjectId(adminId),
                action: `Dispute resolved: ${resolution.outcome}`,
                notes: resolution.notes,
            });

            // Process financial settlement
            await this.processFinancialSettlement(dispute);

            await dispute.save();

            // Update shipment dispute status
            await Shipment.findByIdAndUpdate(dispute.shipmentId, {
                'weightDispute.status': 'resolved',
            });

            logger.info('Dispute resolved', {
                disputeId: dispute.disputeId,
                outcome: resolution.outcome,
                refundAmount: resolution.refundAmount,
                deductionAmount: resolution.deductionAmount,
                resolvedBy: adminId,
            });

            // TODO: Notify seller of resolution (Phase 5)
            // await this.notificationService.sendDisputeResolution(dispute.companyId, dispute);

            // TODO: Audit log (Phase 5)
            // await this.auditLogService.log({...});

            return dispute;
        } catch (error) {
            logger.error('Error resolving dispute', {
                disputeId,
                adminId,
                error: error instanceof Error ? error.message : error,
            });
            throw error;
        }
    }

    /**
     * Auto-resolve disputes after 7 days of inactivity (favor ShipCrowd)
     * Called by background job daily
     * 
     * @returns Number of disputes resolved
     */
    async autoResolveExpiredDisputes(): Promise<number> {
        try {
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

            const expiredDisputes = await WeightDispute.find({
                status: { $in: ['pending', 'under_review'] },
                createdAt: { $lt: sevenDaysAgo },
                isDeleted: false,
            });

            logger.info('Found expired disputes for auto-resolution', {
                count: expiredDisputes.length,
            });

            let resolved = 0;

            for (const dispute of expiredDisputes) {
                try {
                    await this.resolveDispute(String(dispute._id), 'system', {
                        outcome: 'shipcrowd_favor',
                        deductionAmount: dispute.financialImpact.difference,
                        reasonCode: 'AUTO_RESOLVED_NO_RESPONSE',
                        notes: `Automatically resolved after 7 days of no seller response. Original discrepancy: ${dispute.discrepancy.percentage.toFixed(1)}%`,
                    });

                    resolved++;
                } catch (error) {
                    logger.error('Failed to auto-resolve dispute', {
                        disputeId: dispute.disputeId,
                        error: error instanceof Error ? error.message : error,
                    });
                }
            }

            logger.info('Auto-resolved expired disputes', {
                total: expiredDisputes.length,
                resolved,
                failed: expiredDisputes.length - resolved,
            });

            return resolved;
        } catch (error) {
            logger.error('Error in auto-resolve job', {
                error: error instanceof Error ? error.message : error,
            });
            throw error;
        }
    }

    /**
     * Process financial settlement based on resolution
     * - seller_favor: Refund to seller wallet
     * - shipcrowd_favor: Deduct from seller wallet
     * - split: Partial refund/deduction
     * - waived: No financial impact
     */
    private async processFinancialSettlement(dispute: any): Promise<void> {
        try {
            const { outcome, deductionAmount, refundAmount } = dispute.resolution;

            // Seller favor: Refund to wallet
            if (outcome === 'seller_favor' && refundAmount && refundAmount > 0) {
                const result = await WalletService.credit(
                    dispute.companyId.toString(),
                    refundAmount,
                    'other', // TransactionReason
                    `Weight dispute refund for shipment ${dispute.shipmentId}`,
                    {
                        type: 'shipment',
                        id: dispute.shipmentId.toString(),
                        externalId: dispute.disputeId,
                    },
                    'system'
                );

                if (result.success && result.transactionId) {
                    dispute.walletTransactionId = new mongoose.Types.ObjectId(result.transactionId);
                }

                logger.info('Wallet credited for dispute resolution', {
                    disputeId: dispute.disputeId,
                    amount: refundAmount,
                    transactionId: result.transactionId,
                });
            }

            // ShipCrowd favor or split: Deduct from wallet
            if (
                (outcome === 'shipcrowd_favor' || outcome === 'split') &&
                deductionAmount &&
                deductionAmount > 0
            ) {
                // Check wallet balance first
                const balanceInfo = await WalletService.getBalance(dispute.companyId.toString());

                if (balanceInfo.balance >= deductionAmount) {
                    const result = await WalletService.debit(
                        dispute.companyId.toString(),
                        deductionAmount,
                        'other', // TransactionReason
                        `Weight dispute deduction for shipment ${dispute.shipmentId}`,
                        {
                            type: 'shipment',
                            id: dispute.shipmentId.toString(),
                            externalId: dispute.disputeId,
                        },
                        'system'
                    );

                    if (result.success && result.transactionId) {
                        dispute.walletTransactionId = new mongoose.Types.ObjectId(result.transactionId);
                    }

                    logger.info('Wallet debited for dispute resolution', {
                        disputeId: dispute.disputeId,
                        amount: deductionAmount,
                        transactionId: result.transactionId,
                    });
                } else {
                    // Insufficient balance - mark shipment for payment pending
                    await Shipment.findByIdAndUpdate(dispute.shipmentId, {
                        $set: {
                            'paymentPending.amount': deductionAmount,
                            'paymentPending.reason': 'weight_dispute',
                            'paymentPending.disputeId': dispute.disputeId,
                        },
                    });

                    logger.warn('Insufficient wallet balance for dispute deduction', {
                        disputeId: dispute.disputeId,
                        required: deductionAmount,
                        available: balanceInfo.balance,
                    });

                    // TODO: Notify finance team (Phase 5)
                }
            }

            // Waived: No financial impact
            if (outcome === 'waived') {
                logger.info('Dispute waived - no financial settlement', {
                    disputeId: dispute.disputeId,
                });
            }
        } catch (error) {
            logger.error('Error processing financial settlement', {
                disputeId: dispute.disputeId,
                error: error instanceof Error ? error.message : error,
            });
            throw error;
        }
    }

    /**
     * Get dispute metrics for analytics dashboard
     */
    async getDisputeMetrics(companyId?: string, dateRange?: { start: Date; end: Date }): Promise<{
        total: number;
        pending: number;
        underReview: number;
        resolved: number;
        autoResolved: number;
        totalFinancialImpact: number;
        averageResolutionTime: number;
    }> {
        try {
            const query: any = { isDeleted: false };

            if (companyId) {
                query.companyId = new mongoose.Types.ObjectId(companyId);
            }

            if (dateRange) {
                query.createdAt = {
                    $gte: dateRange.start,
                    $lte: dateRange.end,
                };
            }

            const disputes = await WeightDispute.find(query);

            const metrics = {
                total: disputes.length,
                pending: disputes.filter((d) => d.status === 'pending').length,
                underReview: disputes.filter((d) => d.status === 'under_review').length,
                resolved: disputes.filter((d) =>
                    ['manual_resolved', 'auto_resolved'].includes(d.status)
                ).length,
                autoResolved: disputes.filter((d) => d.status === 'auto_resolved').length,
                totalFinancialImpact: disputes.reduce(
                    (sum, d) => sum + (d.financialImpact?.difference || 0),
                    0
                ),
                averageResolutionTime: this.calculateAverageResolutionTime(disputes),
            };

            return metrics;
        } catch (error) {
            logger.error('Error getting dispute metrics', {
                companyId,
                error: error instanceof Error ? error.message : error,
            });
            throw error;
        }
    }

    /**
     * Calculate average resolution time in hours
     */
    private calculateAverageResolutionTime(disputes: any[]): number {
        const resolvedDisputes = disputes.filter((d) => d.resolution?.resolvedAt);

        if (resolvedDisputes.length === 0) return 0;

        const totalHours = resolvedDisputes.reduce((sum, d) => {
            const created = new Date(d.createdAt).getTime();
            const resolved = new Date(d.resolution.resolvedAt).getTime();
            const hours = (resolved - created) / (1000 * 60 * 60);
            return sum + hours;
        }, 0);

        return totalHours / resolvedDisputes.length;
    }
}

export default new WeightDisputeResolutionService();
