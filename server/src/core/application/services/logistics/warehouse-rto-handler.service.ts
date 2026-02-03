import { RTOEvent } from '@/infrastructure/database/mongoose/models';
import logger from '@/shared/logger/winston.logger';
import InsuranceClaimService from './insurance-claim.service';

/**
 * Warehouse RTO Handler
 * 
 * Handles warehouse rejection scenarios:
 * - Damaged goods
 * - Missing items
 * - Quality issues
 * - Incomplete returns
 */
export class WarehouseRTOHandler {
    /**
     * Handle warehouse rejection of RTO
     */
    static async handleWarehouseRejection(params: {
        rtoEventId: string;
        reason: 'damaged' | 'missing_items' | 'qc_failed' | 'incomplete';
        rejectedBy: string;
        notes?: string;
        photos?: string[];
    }): Promise<{
        success: boolean;
        action?: string;
        error?: string;
    }> {
        try {
            const { rtoEventId, reason, rejectedBy, notes, photos } = params;

            const rtoEvent = await RTOEvent.findById(rtoEventId).populate('shipment');

            if (!rtoEvent) {
                return { success: false, error: 'RTO event not found' };
            }

            // Can only reject items in QC pending or delivered to warehouse status
            if (!['qc_pending', 'delivered_to_warehouse'].includes(rtoEvent.returnStatus)) {
                return {
                    success: false,
                    error: `Cannot reject RTO in status: ${rtoEvent.returnStatus}`
                };
            }

            // Update RTOEvent - schema uses nested qcResult
            // warehouse_rejected is not in enum, use valid status 'qc_completed' but mark QC as failed
            rtoEvent.returnStatus = 'qc_completed';
            rtoEvent.qcResult = {
                passed: false,
                remarks: notes || `Rejected: ${reason}`,
                inspectedBy: rejectedBy,
                inspectedAt: new Date()
            };

            if (!rtoEvent.metadata) {
                rtoEvent.metadata = {};
            }

            rtoEvent.metadata.rejectionReason = reason;
            rtoEvent.metadata.rejectedBy = rejectedBy;
            rtoEvent.metadata.rejectedAt = new Date().toISOString();

            if (photos && photos.length > 0) {
                rtoEvent.metadata.rejectionPhotos = photos;
            }

            await rtoEvent.save();

            logger.info('RTO rejected by warehouse', {
                rtoEventId,
                reason,
                rejectedBy
            });

            // Determine next action based on reason
            let action = 'hold_for_review';

            if (reason === 'damaged') {
                action = 'initiate_insurance_claim';
            } else if (reason === 'missing_items') {
                action = 'escalate_to_logistics';
            }

            // Create alert for ops team
            await this.createOpsAlert({
                rtoEventId,
                shipmentId: rtoEvent.shipment._id.toString(),
                reason,
                action,
                notes
            });

            // Initiate insurance claim if applicable
            if (action === 'initiate_insurance_claim') {
                try {
                    const claim = await InsuranceClaimService.initiateClaim({
                        shipmentId: rtoEvent.shipment._id.toString(),
                        companyId: rtoEvent.company.toString(),
                        userId: rejectedBy,
                        reason: reason as any,
                        description: notes
                    });

                    rtoEvent.metadata = {
                        ...(rtoEvent.metadata || {}),
                        insuranceClaimId: claim.disputeId
                    };
                    await rtoEvent.save();
                } catch (claimError: any) {
                    logger.error('Failed to initiate insurance claim', {
                        rtoEventId,
                        error: claimError.message
                    });
                }
            }

            return {
                success: true,
                action
            };

        } catch (error: any) {
            logger.error('Error handling warehouse rejection', {
                error: error.message,
                params
            });
            return { success: false, error: error.message };
        }
    }

    /**
     * Create ops alert for rejected RTO
     */
    private static async createOpsAlert(params: {
        rtoEventId: string;
        shipmentId: string;
        reason: string;
        action: string;
        notes?: string;
    }): Promise<void> {
        try {
            const { default: EmailService } = await import(
                '@/core/application/services/communication/email.service.js'
            );

            const opsEmail = process.env.OPS_ALERT_EMAIL || 'ops@shipcrowd.com';

            const subject = `⚠️ Warehouse RTO Rejection - Action Required`;
            const htmlContent = `
                <h2>RTO Rejected by Warehouse</h2>
                <p><strong>RTO Event ID:</strong> ${params.rtoEventId}</p>
                <p><strong>Shipment ID:</strong> ${params.shipmentId}</p>
                <p><strong>Rejection Reason:</strong> ${params.reason}</p>
                <p><strong>Recommended Action:</strong> ${params.action}</p>
                ${params.notes ? `<p><strong>Notes:</strong> ${params.notes}</p>` : ''}
                <p>Please review in admin dashboard and take appropriate action.</p>
            `;

            await EmailService.sendEmail(
                opsEmail,
                subject,
                htmlContent,
                'RTO Warehouse Rejection Alert'
            );

        } catch (error: any) {
            logger.error('Failed to send warehouse rejection alert', {
                error: error.message,
                params
            });
        }
    }

    /**
     * Get rejection statistics
     */
    static async getRejectionStats(companyId: string, startDate: Date, endDate: Date) {
        const rejections = await RTOEvent.find({
            companyId,
            returnStatus: 'qc_completed',
            'qcResult.passed': false,
            'metadata.rejectedAt': {
                $gte: startDate.toISOString(),
                $lte: endDate.toISOString()
            }
        }).select('metadata.rejectionReason');

        const byReason: Record<string, number> = {};
        rejections.forEach(r => {
            const reason = r.metadata?.rejectionReason || 'unknown';
            byReason[reason] = (byReason[reason] || 0) + 1;
        });

        return {
            total: rejections.length,
            byReason
        };
    }
}
