import { Shipment } from '@/infrastructure/database/mongoose/models';
import logger from '@/shared/logger/winston.logger';

/**
 * Auto-RTO Service
 * 
 * Handles automatic RTO initiation when NDR attempts exceed threshold.
 * Configurable per company.
 */
export class AutoRTOService {
    private static readonly DEFAULT_NDR_THRESHOLD = 3; // Default: 3 failed delivery attempts

    /**
     * Check if shipment should be auto-converted to RTO
     */
    static async checkAndInitiateAutoRTO(shipmentId: string): Promise<{
        shouldRTO: boolean;
        reason?: string;
        initiated?: boolean;
    }> {
        try {
            const shipment = await Shipment.findById(shipmentId)
                .populate('companyId', 'settings');

            if (!shipment) {
                return { shouldRTO: false };
            }

            // Already in RTO/delivered/cancelled - skip
            if (['rto_initiated', 'rto_in_transit', 'rto_delivered', 'delivered', 'cancelled'].includes(shipment.currentStatus)) {
                return { shouldRTO: false };
            }

            // Not in NDR status - skip
            if (shipment.currentStatus !== 'ndr_pending') {
                return { shouldRTO: false };
            }

            // Get company-specific threshold (or use default)
            const threshold = (shipment.companyId as any)?.settings?.rto?.autoRTOThreshold || this.DEFAULT_NDR_THRESHOLD;

            // Count NDR attempts
            const ndrAttemptCount = shipment.ndrDetails?.attempts?.length || 0;

            if (ndrAttemptCount < threshold) {
                return { shouldRTO: false };
            }

            // Exceeded threshold - initiate RTO
            logger.info('Initiating auto-RTO due to exceeded NDR attempts', {
                shipmentId,
                ndrAttempts: ndrAttemptCount,
                threshold
            });

            // Dynamic import to avoid circular deps
            const { RTOService } = await import('../rto/rto.service.js');

            const rtoResult = await RTOService.initiateRTO({
                shipmentId,
                reason: 'auto_rto_ndr_threshold',
                requestedBy: 'system',
                metadata: {
                    ndrAttempts: ndrAttemptCount,
                    threshold,
                    triggeredAt: new Date().toISOString()
                }
            });

            return {
                shouldRTO: true,
                reason: `NDR attempts (${ndrAttemptCount}) exceeded threshold (${threshold})`,
                initiated: rtoResult.success
            };

        } catch (error: any) {
            logger.error('Error in auto-RTO check', {
                shipmentId,
                error: error.message
            });
            return { shouldRTO: false };
        }
    }

    /**
     * Get statistics on auto-RTO triggers
     */
    static async getStatistics(companyId: string, startDate: Date, endDate: Date) {
        const shipments = await Shipment.find({
            companyId,
            currentStatus: { $in: ['rto_initiated', 'rto_in_transit', 'rto_delivered'] },
            'metadata.autoRTOTriggered': true,
            createdAt: { $gte: startDate, $lte: endDate }
        }).select('trackingNumber ndrDetails createdAt');

        return {
            total: shipments.length,
            avgNDRAttempts: shipments.reduce((sum, s) => sum + (s.ndrDetails?.attempts?.length || 0), 0) / (shipments.length || 1)
        };
    }
}
