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
import { Shipment } from '../../../database/mongoose/models/index.js';
import { ShipmentService } from '../../../../core/application/services/shipping/shipment.service.js';
import { EkartWebhookPayload, EKART_STATUS_MAP } from './ekart.types.js';
import logger from '../../../../shared/logger/winston.logger.js';
import { NotFoundError } from '../../../../shared/errors/app.error.js';

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
    private static async handleTrackUpdated(payload: any): Promise<{ success: boolean; message: string }> {
        const { tracking_id, status, location, description, timestamp } = payload;

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

        if (!internalStatus) {
            logger.warn('Unknown Ekart status in webhook', { status, trackingId: tracking_id });
            return { success: true, message: 'Unknown status, ignored' };
        }

        // 3. Check if status update is needed
        if (shipment.currentStatus === internalStatus) {
            return { success: true, message: 'Status already up to date' };
        }

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
            return { success: true, message: 'Status updated successfully' };
        } else {
            logger.error('Failed to update shipment status from webhook', {
                shipmentId: shipment._id,
                error: result.error
            });
            // If it's a version conflict, we might want to fail so Ekart retries, 
            // or just log it if we assume eventual consistency/polling will fix it.
            // For webhooks, generally good to return 200 unless it's a system error.
            return { success: false, message: result.error || 'Update failed' };
        }
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
