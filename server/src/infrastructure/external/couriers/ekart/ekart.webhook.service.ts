/**
 * Ekart Webhook Service
 * 
 * Handles incoming webhooks from Ekart Logistics.
 * Processes tracking updates and shipment creation events.
 * 
 * Flow:
 * 1. Receive payload
 * 2. Validate signature (if applicable)
 * 3. Find shipment by tracking number
 * 4. Map external status to internal status
 * 5. Update shipment via ShipmentService
 */

import mongoose from 'mongoose';
import crypto from 'crypto';
import { Shipment } from '../../../database/mongoose/models/index';
import { ShipmentService } from '../../../../core/application/services/shipping/shipment.service';
import weightDisputeDetectionService from '../../../../core/application/services/disputes/weight-dispute-detection.service';
import { EkartWebhookPayload, EKART_STATUS_MAP, EkartTrackUpdatedWebhook } from './ekart.types';
import logger from '../../../../shared/logger/winston.logger';
import { NotFoundError } from '../../../../shared/errors/app.error';

export class EkartWebhookService {

    /**
     * Process incoming webhook payload
     */
    static async processWebhook(payload: EkartWebhookPayload): Promise<{ success: boolean; message: string }> {
        try {
            logger.info('Received Ekart webhook', {
                event: payload.event,
                trackingId: payload.tracking_id
            });

            // Handle different event types
            switch (payload.event) {
                case 'track_updated':
                    return await this.handleTrackUpdated(payload);

                case 'shipment_created':
                    // Just log for now, as we handle creation synchronously usually
                    logger.info('Ekart shipment created event received', { trackingId: payload.tracking_id });
                    return { success: true, message: 'Event logged' };

                default:
                    logger.warn('Unknown Ekart webhook event', payload);
                    return { success: false, message: 'Unknown event type' };
            }
        } catch (error: any) {
            logger.error('Error processing Ekart webhook', {
                error: error.message,
                payload
            });
            throw error;
        }
    }

    /**
     * Handle track_updated event
     */
    private static async handleTrackUpdated(payload: EkartTrackUpdatedWebhook): Promise<{ success: boolean; message: string }> {
        const { tracking_id, status, location, description, timestamp, weight, dimensions } = payload;

        // 1. Find shipment by AWB
        const shipment = await Shipment.findOne({
            'carrierDetails.carrierTrackingNumber': tracking_id
        });

        if (!shipment) {
            logger.warn('Shipment not found for Ekart webhook', { trackingId: tracking_id });
            // We return success to prevent webhook retries for non-existent shipments
            return { success: true, message: 'Shipment not found, ignored' };
        }

        // 2. Map status
        const internalStatus = EKART_STATUS_MAP[status];

        if (internalStatus) {
            // 3. Check if status update is needed
            if (shipment.currentStatus !== internalStatus) {
                // 4. Update shipment status using service
                // Use 'system' as userId for webhook updates
                const result = await ShipmentService.updateShipmentStatus({
                    shipmentId: (shipment._id as mongoose.Types.ObjectId).toString(),
                    currentStatus: shipment.currentStatus,
                    newStatus: internalStatus,
                    currentVersion: shipment.__v || 0,
                    userId: 'system',
                    location: location,
                    description: description || `Status updated to ${status} by Ekart`
                });

                if (result.success) {
                    logger.info('Shipment status updated via Ekart webhook', {
                        shipmentId: shipment._id,
                        oldStatus: shipment.currentStatus,
                        newStatus: internalStatus
                    });
                } else {
                    logger.error('Failed to update shipment status from webhook', {
                        shipmentId: shipment._id,
                        error: result.error
                    });
                }
            }
        } else {
            logger.warn('Unknown Ekart status in webhook', { status, trackingId: tracking_id });
        }

        // 5. Weight extraction (Ekart sends weight in grams as string)
        if (weight && weight !== "0.0" && weight !== "0") {
            const weightGrams = parseFloat(weight);
            const weightKg = weightGrams / 1000;

            // Only process meaningful weights (>10g to filter errors)
            if (weightKg > 0.01) {
                logger.info('[Ekart] Weight extracted from webhook', {
                    trackingId: tracking_id,
                    weightKg,
                    dimensions
                });

                // Update shipment weights
                shipment.weights.actual = {
                    value: weightKg,
                    unit: 'kg',
                    scannedAt: timestamp ? new Date(timestamp * 1000) : new Date(),
                    scannedBy: 'Ekart'
                };

                // Add dimensions if available
                if (dimensions) {
                    shipment.weights.actual.dimensions = {
                        length: dimensions.length || 0,
                        width: dimensions.width || 0,
                        height: dimensions.height || 0
                    };
                }

                // Add scannedLocation if available
                if (location) {
                    shipment.weights.actual.scannedLocation = location;
                }

                await shipment.save();

                // Trigger dispute detection
                try {
                    await weightDisputeDetectionService.detectOnCarrierScan(
                        (shipment._id as mongoose.Types.ObjectId).toString(),
                        { value: weightKg, unit: 'kg' },
                        {
                            scannedAt: timestamp ? new Date(timestamp * 1000) : new Date(),
                            location: location || 'Ekart Hub',
                            notes: `Ekart DWS scan: ${weightKg}kg`,
                            carrierName: 'Ekart'
                        }
                    );
                } catch (disputeError) {
                    logger.error('[Ekart] Error triggering weight dispute detection', {
                        shipmentId: shipment._id,
                        error: disputeError instanceof Error ? disputeError.message : disputeError
                    });
                }
            }
        }

        return { success: true, message: 'Track updated with weight extraction' };
    }

    /**
     * Verify webhook signature (HMAC SHA256)
     * 
     * Verifies that the request actually came from Ekart.
     * header: x-ekart-signature
     * algorithm: hmac-sha256
     * 
     * @param signature The signature from x-ekart-signature header
     * @param rawBody The raw request body string
     * @param secret The webhook secret from config
     */
    static verifySignature(signature: string, rawBody: string, secret: string): boolean {
        try {
            if (!signature || !secret || !rawBody) {
                return false;
            }

            // Create HMAC SHA256 hash using secret
            const hmac = crypto.createHmac('sha256', secret);
            const expectedSignature = hmac.update(rawBody).digest('hex');

            // Constant time comparison to prevent timing attacks
            return crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature)
            );
        } catch (error) {
            logger.error('Error verifying Ekart signature', { error });
            return false;
        }
    }
}
