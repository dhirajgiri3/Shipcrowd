import mongoose from 'mongoose';
import logger from '../../../../shared/logger/winston.logger';
import DisputeService from './dispute.service';
import Dispute from '../../../../infrastructure/database/mongoose/models/logistics/disputes/dispute.model';

export type InsuranceClaimReason = 'damaged' | 'missing_items' | 'qc_failed' | 'incomplete' | 'lost';

export default class InsuranceClaimService {
    /**
     * Create or reuse an insurance dispute claim for a shipment.
     */
    static async initiateClaim(params: {
        shipmentId: string;
        companyId: string;
        userId: string;
        reason: InsuranceClaimReason;
        description?: string;
        metadata?: Record<string, any>;
    }): Promise<{ disputeId: string }> {
        const { shipmentId, companyId, userId, reason } = params;

        // Check existing active insurance dispute
        const existing = await Dispute.findOne({
            shipmentId: new mongoose.Types.ObjectId(shipmentId),
            status: { $in: ['pending', 'investigating', 'escalated'] },
            tags: { $in: ['insurance_claim'] }
        }).select('disputeId');

        if (existing) {
            return { disputeId: existing.disputeId };
        }

        const disputeType = reason === 'lost' ? 'lost' : 'damage';
        const category =
            reason === 'missing_items'
                ? 'missing_item'
                : reason === 'lost'
                    ? 'lost_in_transit'
                    : 'damaged_product';

        const dispute = await DisputeService.createDispute({
            shipmentId,
            companyId,
            userId,
            type: disputeType as any,
            category: category as any,
            description:
                params.description ||
                `Insurance claim initiated due to ${reason.replace('_', ' ')}.`,
            evidence: params.metadata?.evidence
                ? [
                    {
                        type: 'document',
                        url: params.metadata.evidence,
                        description: 'Insurance claim evidence'
                    }
                ]
                : undefined
        });

        await Dispute.findByIdAndUpdate(dispute._id, {
            $addToSet: { tags: 'insurance_claim' }
        });

        logger.info('Insurance claim dispute created', {
            shipmentId,
            disputeId: dispute.disputeId,
            reason
        });

        return { disputeId: dispute.disputeId };
    }
}
