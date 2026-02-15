import crypto from 'crypto';
import mongoose from 'mongoose';
import { ShipmentService } from '../../../../core/application/services/shipping/shipment.service';
import logger from '../../../../shared/logger/winston.logger';
import { Shipment } from '../../../database/mongoose/models';
import { VelocityWebhookPayload } from './velocity-webhook.types';
import { VELOCITY_STATUS_MAP } from './velocity.types';

export class VelocityWebhookService {
    /**
     * Process incoming webhook payload
     */
    static async processWebhook(payload: VelocityWebhookPayload): Promise<{ success: boolean; message: string }> {
        try {
            logger.info('Received Velocity webhook', {
                eventType: payload.event_type,
                timestamp: payload.timestamp
            });

            switch (payload.event_type) {
                case 'SHIPMENT_STATUS_UPDATE':
                case 'REVERSE_SHIPMENT_STATUS_UPDATE':
                    return await this.handleStatusUpdate(payload);

                case 'SHIPMENT_CREATED':
                    logger.info('Velocity shipment created event received', {
                        awb: payload.shipment_data?.awb,
                        orderId: payload.shipment_data?.order_id
                    });
                    return { success: true, message: 'Event logged' };

                default:
                    logger.warn('Unhandled Velocity webhook event type', { eventType: payload.event_type });
                    return { success: true, message: 'Event ignored' };
            }
        } catch (error: any) {
            logger.error('Error processing Velocity webhook', {
                error: error.message,
                payload
            });
            throw error;
        }
    }

    /**
     * Handle shipment status update events
     */
    private static async handleStatusUpdate(payload: VelocityWebhookPayload): Promise<{ success: boolean; message: string }> {
        const shipmentData = payload.shipment_data || payload.tracking_event;

        if (!shipmentData) {
            logger.warn('Missing shipment/tracking data in Velocity webhook', { payload });
            return { success: false, message: 'Missing shipment data' };
        }

        // Handle inconsistent payload structures
        const awb = (shipmentData as any).awb || (payload.shipment_data?.awb);
        const status = shipmentData.status;
        const location = (shipmentData as any).location || (shipmentData as any).current_location;
        const description = (shipmentData as any).description;

        if (!awb) {
            logger.warn('Missing AWB in Velocity webhook', { payload });
            return { success: false, message: 'Missing AWB' };
        }

        // 1. Find shipment by AWB
        const shipment = await Shipment.findOne({
            'carrierDetails.carrierTrackingNumber': awb
        });

        if (!shipment) {
            logger.warn('Shipment not found for Velocity webhook', { awb });
            return { success: true, message: 'Shipment not found, ignored' };
        }

        // 2. Map status
        const internalStatus = VELOCITY_STATUS_MAP[status] || VELOCITY_STATUS_MAP[status.toUpperCase()];

        if (!internalStatus) {
            logger.warn('Unknown Velocity status in webhook', { status, awb });
            return { success: true, message: 'Unknown status, ignored' };
        }

        // 3. Update shipment status
        const result = await ShipmentService.updateShipmentStatus({
            shipmentId: (shipment._id as mongoose.Types.ObjectId).toString(),
            currentStatus: shipment.currentStatus,
            newStatus: internalStatus,
            currentVersion: shipment.__v || 0,
            userId: 'system',
            location: location,
            description: description || `Status updated to ${status} by Velocity`
        });

        if (result.success) {
            logger.info('Shipment status updated via Velocity webhook', {
                shipmentId: shipment._id,
                oldStatus: shipment.currentStatus,
                newStatus: internalStatus
            });
            return { success: true, message: 'Status updated successfully' };
        } else {
            logger.error('Failed to update shipment status from Velocity webhook', {
                shipmentId: shipment._id,
                error: result.error
            });
            return { success: false, message: result.error || 'Update failed' };
        }
    }

    /**
     * Verify webhook signature (HMAC SHA256)
     * 
     * Verifies that the request came from Velocity.
     * Header: x-velocity-signature
     * Algorithm: HMAC-SHA256
     */
    static verifySignature(signature: string, rawBody: string, secret: string): boolean {
        try {
            if (!signature || !secret || !rawBody) {
                return false;
            }

            // Create HMAC SHA256 hash using secret
            const hmac = crypto.createHmac('sha256', secret);
            const expectedSignature = hmac.update(rawBody).digest('hex');

            // Constant time comparison
            return crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature)
            );
        } catch (error) {
            logger.error('Error verifying Velocity signature', { error });
            return false;
        }
    }
}
