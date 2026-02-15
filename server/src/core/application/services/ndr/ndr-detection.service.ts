/**
 * Ndr Detection
 * 
 * Purpose: NDRDetectionService
 * 
 * DEPENDENCIES:
 * - Database Models, Logger
 * 
 * TESTING:
 * Unit Tests: tests/unit/services/.../{filename}.test.ts
 * Coverage: TBD
 * 
 * NOTE: This service needs comprehensive documentation.
 * See SERVICE_TEMPLATE.md for documentation standards.
 */

import { INDREvent, NDREvent } from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';
import NDRClassificationService from './ndr-classification.service';

interface TrackingUpdate {
    awb: string;
    status: string;
    statusCode?: string;
    remarks?: string;
    timestamp: Date;
    location?: string;
}

interface ShipmentInfo {
    _id: string;
    awb: string;
    orderId: string;
    companyId: string;
    customer?: {
        name: string;
        phone: string;
        email?: string;
    };
    deliveryAttempts?: number;
}

interface DetectionResult {
    isNDR: boolean;
    ndrEvent?: INDREvent;
    reason?: string;
}

// NDR status patterns from various couriers
const NDR_STATUS_PATTERNS = [
    'failed_delivery',
    'delivery_failed',
    'ndr',
    'non_delivery',
    'undelivered',
    'customer_unavailable',
    'address_issue',
    'refused',
    'rto_initiated',
    'out_for_delivery_failed',
    'delivery_attempt_failed',
    'not_delivered',
];

// Keywords indicating NDR in remarks
const NDR_KEYWORDS = [
    'not available',
    'unavailable',
    'wrong address',
    'incomplete address',
    'address not found',
    'refused',
    'rejected',
    'cod not ready',
    'payment issue',
    'door locked',
    'house locked',
    'office closed',
    'customer not reachable',
    'phone switched off',
    'unreachable',
    'no response',
    'customer denied',
    'customer denied',
];

export default class NDRDetectionService {
    /**
     * Real-time webhook-driven NDR detection (replaces cron polling)
     */
    static async handleWebhookNDRDetection(data: {
        carrier: string;
        awb: string;
        status: string;
        remarks?: string;
        timestamp: Date;
    }): Promise<{ created: boolean; ndrEvent?: INDREvent }> {
        // Import Shipment model to avoid circular dependency issues at top level if any
        const { Shipment } = await import('../../../../infrastructure/database/mongoose/models');

        // Get shipment details
        const shipment = await Shipment.findOne({
            $or: [
                { trackingNumber: data.awb },
                { 'carrierDetails.carrierTrackingNumber': data.awb }
            ]
        }).populate('orderId companyId');

        if (!shipment) {
            logger.warn('Shipment not found for NDR detection', { awb: data.awb });
            return { created: false };
        }

        // Check for duplicate NDR (within 24 hours)
        const isDuplicate = await this.checkForDuplicateNDR(data.awb, data.timestamp);
        if (isDuplicate) {
            logger.info('Duplicate NDR, updating existing', { awb: data.awb });
            return { created: false };
        }

        // Extract reason and create NDR event
        const ndrReason = this.extractNDRReason(data.status, data.remarks);
        const attemptNumber = await this.calculateAttemptNumber(data.awb);

        // Prepare shipment info structure expected by createNDREvent
        const shipmentInfo: ShipmentInfo = {
            _id: (shipment._id as any).toString(),
            awb: shipment.trackingNumber,
            orderId: (shipment.orderId as any)._id,
            companyId: (shipment.companyId as any)._id,
            customer: (shipment.orderId as any).customer,
            deliveryAttempts: attemptNumber
        };

        const ndrEvent = await this.createNDREvent(
            shipmentInfo,
            ndrReason,
            attemptNumber,
            data.remarks
        );

        // Trigger async processing (don't wait)
        setImmediate(async () => {
            try {
                // AI classification
                await NDRClassificationService.classifyAndUpdate(String(ndrEvent._id));

                // Import Resolution Service dynamically
                // const { default: NDRResolutionService } = await import('./ndr-resolution.service');
                // await NDRResolutionService.executeResolutionWorkflow(String(ndrEvent._id));

                // Send immediate notifications (Phase 4)
                const { default: NDRCommunicationService } = await import('../communication/ndr-communication.service.js');

                // Notify Buyer
                await NDRCommunicationService.sendNDRNotification({
                    ndrEventId: String(ndrEvent._id),
                    shipmentId: String(shipmentInfo._id),
                    channel: 'all',
                    templateType: 'ndr_alert'
                });

                // Notify Seller
                await NDRCommunicationService.sendSellerNotification(
                    String(ndrEvent._id),
                    String(shipmentInfo._id)
                );

            } catch (error) {
                logger.error('NDR post-processing failed', { error });
            }
        });

        logger.info('Real-time NDR detection completed', {
            ndrEventId: ndrEvent._id,
            awb: data.awb,
            latency: Date.now() - data.timestamp.getTime()
        });

        return { created: true, ndrEvent };
    }

    /**
     * Detect NDR from tracking update
     */
    static async detectNDRFromTracking(
        trackingUpdate: TrackingUpdate,
        shipment: ShipmentInfo
    ): Promise<DetectionResult> {
        const { awb, status, remarks, timestamp } = trackingUpdate;

        // Check if status indicates NDR
        if (!this.isNDRStatus(status, remarks)) {
            return { isNDR: false };
        }

        logger.info('NDR detected from tracking', {
            awb,
            status,
            remarks,
        });

        // Check for duplicate NDR within 24 hours
        const isDuplicate = await this.checkForDuplicateNDR(awb, timestamp);
        if (isDuplicate) {
            logger.info('Duplicate NDR detected, skipping creation', { awb });
            return { isNDR: true, reason: 'Duplicate NDR' };
        }

        // Extract NDR reason
        const ndrReason = this.extractNDRReason(status, remarks);

        // Calculate attempt number
        const attemptNumber = await this.calculateAttemptNumber(awb);

        // Create NDR event
        const ndrEvent = await this.createNDREvent(shipment, ndrReason, attemptNumber, remarks);

        // Classify using AI
        await NDRClassificationService.classifyAndUpdate(String(ndrEvent._id));

        return {
            isNDR: true,
            ndrEvent,
        };
    }

    /**
     * Check if tracking status indicates NDR
     */
    static isNDRStatus(status: string, remarks?: string): boolean {
        const normalizedStatus = status.toLowerCase().replace(/[^a-z]/g, '_');

        // Check status patterns
        for (const pattern of NDR_STATUS_PATTERNS) {
            if (normalizedStatus.includes(pattern)) {
                return true;
            }
        }

        // Check remarks for NDR keywords
        if (remarks) {
            const normalizedRemarks = remarks.toLowerCase();
            for (const keyword of NDR_KEYWORDS) {
                if (normalizedRemarks.includes(keyword)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Extract NDR reason from status and remarks
     */
    static extractNDRReason(status: string, remarks?: string): string {
        // Prefer remarks over status as it's more descriptive
        if (remarks && remarks.trim().length > 10) {
            return remarks.trim();
        }

        // Clean up status for human readability
        return status
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .trim();
    }

    /**
     * Check for duplicate NDR within 24 hours
     */
    static async checkForDuplicateNDR(awb: string, detectedAt: Date): Promise<boolean> {
        const twentyFourHoursAgo = new Date(detectedAt.getTime() - 24 * 60 * 60 * 1000);

        const existingNDR = await NDREvent.findOne({
            awb,
            detectedAt: { $gte: twentyFourHoursAgo },
            status: { $ne: 'resolved' },
        });

        return !!existingNDR;
    }

    /**
     * Calculate attempt number for this AWB
     */
    static async calculateAttemptNumber(awb: string): Promise<number> {
        const previousNDRs = await NDREvent.countDocuments({ awb });
        return previousNDRs + 1;
    }

    /**
     * Create NDR event
     */
    static async createNDREvent(
        shipment: ShipmentInfo,
        ndrReason: string,
        attemptNumber: number,
        courierRemarks?: string
    ): Promise<INDREvent> {
        const ndrEvent = await NDREvent.createNDREvent({
            shipment: shipment._id as any,
            awb: shipment.awb,
            ndrReason,
            attemptNumber,
            courierRemarks,
            company: shipment.companyId as any,
            order: shipment.orderId as any,
            status: 'detected',
            classificationSource: 'keyword', // Will be updated after AI classification
        });

        logger.info('NDR event created', {
            ndrEventId: ndrEvent._id,
            awb: shipment.awb,
            attemptNumber,
            reason: ndrReason,
        });

        return ndrEvent;
    }

    /**
     * Process bulk tracking updates for NDR detection
     */
    static async processBulkTrackingUpdates(
        updates: { tracking: TrackingUpdate; shipment: ShipmentInfo }[]
    ): Promise<{ detected: number; skipped: number }> {
        let detected = 0;
        let skipped = 0;

        for (const { tracking, shipment } of updates) {
            try {
                const result = await this.detectNDRFromTracking(tracking, shipment);
                if (result.isNDR && result.ndrEvent) {
                    detected++;
                } else if (result.isNDR) {
                    skipped++;
                }
            } catch (error: any) {
                logger.error('Error processing tracking for NDR detection', {
                    awb: tracking.awb,
                    error: error.message,
                });
            }
        }

        return { detected, skipped };
    }

    /**
     * Get active NDRs for company
     */
    static async getActiveNDRs(companyId: string): Promise<INDREvent[]> {
        return NDREvent.getPendingNDRs(companyId);
    }

    /**
     * Get expired NDRs for auto-RTO processing
     */
    static async getExpiredNDRs(): Promise<INDREvent[]> {
        return NDREvent.getExpiredNDRs();
    }
}
