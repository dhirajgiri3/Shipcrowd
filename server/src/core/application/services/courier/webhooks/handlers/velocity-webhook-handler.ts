/**
 * Velocity Webhook Handler
 * 
 * Handles Velocity-specific webhook processing with:
 * - API key verification (Velocity doesn't provide signatures)
 * - Custom payload parsing
 * - Integration with StatusMapperService
 */

import { Request } from 'express';
import { BaseWebhookHandler } from '../base-webhook-handler';
import {
VerificationStrategy,
WebhookConfig,
WebhookPayload
} from '../webhook-handler.interface';

/**
 * Velocity webhook handler implementation
 */
export class VelocityWebhookHandler extends BaseWebhookHandler {
    constructor() {
        const config: WebhookConfig = {
            courier: 'velocity',
            verificationStrategy: VerificationStrategy.API_KEY,
            apiKeyHeader: 'x-api-key',
            secretKey: process.env.VELOCITY_WEBHOOK_API_KEY
        };

        super(config);
    }

    /**
     * Parse Velocity-specific webhook payload
     * 
     * NOTE: Velocity webhook documentation is limited. This is based on
     * their tracking response structure. Adjust as needed when real webhooks arrive.
     */
    parseWebhook(req: Request): WebhookPayload {
        const body = req.body;

        // Velocity webhook structure (estimated from API docs)
        const awb = body.awb_code || body.tracking_number || body.awb;
        const status = body.shipment_status || body.status || 'UNKNOWN';
        const timestamp = body.timestamp
            ? new Date(body.timestamp)
            : new Date();

        return {
            courier: 'velocity',
            awb,
            event: body.event_type || 'status_update',
            status,
            timestamp,
            rawPayload: body,
            metadata: {
                location: body.current_location || body.location || '',
                description: body.activity || body.description || '',
                courierName: body.courier_name || '',
                estimatedDelivery: body.estimated_delivery || '',
                // Additional Velocity-specific fields
                orderId: body.order_id,
                shipmentId: body.shipment_id,
                warehouseId: body.warehouse_id
            }
        };
    }

    /**
     * Process webhook with real-time NDR detection
     * Overrides base handler to check for NDR before status mapping
     */
    async handleWebhook(payload: WebhookPayload): Promise<void> {
        // Check for NDR using Velocity-specific patterns
        if (this.isNDREvent(payload)) {
            await this.triggerNDRDetection(payload);
        }

        // Continue with standard webhook processing (status mapping, DB update)
        await super.handleWebhook(payload);
    }

    /**
     * Check if webhook payload indicates an NDR event
     */
    private isNDREvent(payload: WebhookPayload): boolean {
        const patterns = this.getNDRPatterns();
        const status = payload.status.toUpperCase();
        const description = (payload.metadata?.description || '').toLowerCase();

        // Check status codes
        if (patterns.statusCodes.some(code => status.includes(code))) {
            return true;
        }

        // Check keywords in description/activity
        return patterns.keywords.some(keyword => description.includes(keyword));
    }

    /**
     * Get Velocity-specific NDR patterns
     */
    protected getNDRPatterns() {
        return {
            statusCodes: ['UNDELIVERED', 'FAILED', 'DELIVERY_FAILED', 'RTO', 'RT'],
            keywords: [
                'customer not available',
                'customer refused',
                'incomplete address',
                'wrong address',
                'customer unreachable',
                'phone switched off',
                'reschedule requested',
                'delivery attempted',
                'consignee not available',
                'refused by consignee'
            ]
        };
    }
}
