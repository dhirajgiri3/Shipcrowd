/**
 * Ekart Webhook Handler
 * 
 * Handles Ekart-specific webhook processing with:
 * - HMAC SHA256 signature verification
 * - Custom payload parsing for track_updated and shipment_created events
 * - Integration with StatusMapperService
 */

import { Request } from 'express';
import { BaseWebhookHandler } from '../base-webhook-handler';
import {
    WebhookPayload,
    WebhookConfig,
    VerificationStrategy
} from '../webhook-handler.interface';

/**
 * Ekart webhook handler implementation
 */
export class EkartWebhookHandler extends BaseWebhookHandler {
    constructor() {
        const config: WebhookConfig = {
            courier: 'ekart',
            verificationStrategy: VerificationStrategy.HMAC_SHA256,
            signatureHeader: 'x-ekart-signature',
            secretKey: process.env.EKART_WEBHOOK_SECRET
        };

        super(config);
    }

    /**
     * Parse Ekart-specific webhook payload
     * 
     * Ekart sends different payloads for different events:
     * - track_updated: Contains status, location, timestamp
     * - shipment_created: Contains tracking_id, vendor, order_number
     */
    parseWebhook(req: Request): WebhookPayload {
        const body = req.body;

        // Determine event type
        const event = this.determineEventType(body);

        // Parse based on event type
        if (event === 'track_updated') {
            return this.parseTrackUpdatedEvent(body);
        } else if (event === 'shipment_created') {
            return this.parseShipmentCreatedEvent(body);
        }

        // Fallback for unknown events
        return this.parseGenericEvent(body);
    }

    /**
     * Determine event type from payload
     */
    private determineEventType(body: any): string {
        // Explicit event field
        if (body.event) {
            return body.event;
        }

        // Infer from payload structure
        if (body.status && body.wbn) {
            return 'track_updated';
        }

        if (body.id && body.vendor && body.orderNumber) {
            return 'shipment_created';
        }

        return 'unknown';
    }

    /**
     * Parse track_updated event
     * 
     * Example payload:
     * {
     *   "ctime": 1657523187604,
     *   "status": "Delivered",
     *   "location": "",
     *   "desc": "Delivered Successfully",
     *   "attempts": "0",
     *   "pickupTime": 1655980197000,
     *   "wbn": "318019134877",
     *   "id": "501346BN6838925",
     *   "orderNumber": "41839",
     *   "edd": 1657523187609
     * }
     */
    private parseTrackUpdatedEvent(body: any): WebhookPayload {
        const awb = body.id || body.wbn || body.tracking_id;
        const status = body.status || 'UNKNOWN';
        const timestamp = body.ctime
            ? new Date(body.ctime)
            : new Date();

        return {
            courier: 'ekart',
            awb,
            event: 'track_updated',
            status,
            timestamp,
            rawPayload: body,
            metadata: {
                location: body.location || '',
                description: body.desc || body.description || '',
                orderNumber: body.orderNumber || '',
                wbn: body.wbn || '',
                attempts: body.attempts || 0,
                pickupTime: body.pickupTime,
                edd: body.edd,
                ndrStatus: body.ndrStatus,
                ndrActions: body.ndrActions
            }
        };
    }

    /**
     * Parse shipment_created event
     * 
     * Example payload:
     * {
     *   "id": "509271DS0153341",
     *   "wbn": "3496549343",
     *   "vendor": "EKART",
     *   "orderNumber": "RAZNE009",
     *   "channelId": "66111e20da60dcb528a11cad"
     * }
     */
    private parseShipmentCreatedEvent(body: any): WebhookPayload {
        const awb = body.id || body.tracking_id;
        const timestamp = new Date();

        return {
            courier: 'ekart',
            awb,
            event: 'shipment_created',
            status: 'Order Placed', // Default status for new shipments
            timestamp,
            rawPayload: body,
            metadata: {
                wbn: body.wbn || '',
                vendor: body.vendor || '',
                orderNumber: body.orderNumber || '',
                channelId: body.channelId || ''
            }
        };
    }

    /**
     * Parse generic/unknown event
     */
    private parseGenericEvent(body: any): WebhookPayload {
        const awb = body.tracking_id || body.id || body.wbn || 'UNKNOWN';
        const status = body.status || 'UNKNOWN';
        const timestamp = body.timestamp
            ? new Date(body.timestamp)
            : new Date();

        return {
            courier: 'ekart',
            awb,
            event: body.event || 'unknown',
            status,
            timestamp,
            rawPayload: body,
            metadata: {}
        };
    }

    /**
     * Process webhook with real-time NDR detection
     * Overrides base handler to check for NDR before status mapping
     */
    async handleWebhook(payload: WebhookPayload): Promise<void> {
        // Check for NDR using Ekart-specific patterns
        // Ekart provides explicit ndrStatus field which is most reliable
        if (this.isNDREvent(payload)) {
            await this.triggerNDRDetection(payload);
        }

        // Continue with standard webhook processing
        await super.handleWebhook(payload);
    }

    /**
     * Check if webhook payload indicates an NDR event
     * Ekart provides explicit ndrStatus field for NDR events
     */
    private isNDREvent(payload: WebhookPayload): boolean {
        // Ekart provides explicit ndrStatus field - most reliable
        if (payload.metadata?.ndrStatus) {
            return true;
        }

        const patterns = this.getNDRPatterns();
        const status = payload.status.toUpperCase();
        const description = (payload.metadata?.description || '').toLowerCase();

        // Check status codes
        if (patterns.statusCodes.some(code => status.includes(code))) {
            return true;
        }

        // Check keywords in description
        return patterns.keywords.some(keyword => description.includes(keyword));
    }

    /**
     * Get Ekart-specific NDR patterns
     */
    protected getNDRPatterns() {
        return {
            statusCodes: ['NDR', 'UNDELIVERED', 'RTO'],
            keywords: [
                'undelivered',
                'customer not available',
                'refused',
                'rejected',
                'address issue',
                'wrong address',
                'unreachable',
                'attempt failed'
            ]
        };
    }
}
