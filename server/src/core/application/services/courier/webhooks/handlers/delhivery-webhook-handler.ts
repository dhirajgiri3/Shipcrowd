/**
 * Delhivery Webhook Handler
 * 
 * Handles Delhivery-specific webhook processing with:
 * - IP whitelist verification (Delhivery has NO signature support)
 * - Custom payload parsing
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
 * Delhivery webhook handler implementation
 */
export class DelhiveryWebhookHandler extends BaseWebhookHandler {
    constructor() {
        const config: WebhookConfig = {
            courier: 'delhivery',
            verificationStrategy: VerificationStrategy.IP_WHITELIST,
            allowedIPs: process.env.DELHIVERY_WEBHOOK_ALLOWED_IPS?.split(',') || []
        };

        super(config);
    }

    /**
     * Parse Delhivery-specific webhook payload
     * 
     * Based on Delhivery API documentation:
     * https://developers.delhivery.com/docs/webhooks
     */
    parseWebhook(req: Request): WebhookPayload {
        const body = req.body;
        const shipment = body.Shipment || body;
        const status = shipment.Status || {};

        const awb = shipment.AWB || shipment.waybill || '';
        const statusCode = status.Status || status.StatusCode || 'UNKNOWN';
        const timestamp = status.StatusDateTime
            ? new Date(status.StatusDateTime)
            : new Date();

        return {
            courier: 'delhivery',
            awb,
            event: status.StatusType || 'status_update',
            status: statusCode,
            timestamp,
            rawPayload: body,
            metadata: {
                location: status.StatusLocation || '',
                description: status.Instructions || status.Remarks || '',
                nslCode: shipment.NSLCode || '',
                pickupDate: shipment.PickUpDate || '',
                // Additional Delhivery-specific fields
                orderNumber: shipment.ReferenceNo || '',
                clientName: shipment.ClientName || '',
                destination: shipment.Destination || '',
                origin: shipment.Origin || ''
            }
        };
    }
}
