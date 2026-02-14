/**
 * Delhivery Webhook Handler
 * 
 * Handles Delhivery-specific webhook processing with:
 * - Authorization Token verification (Custom Header)
 * - Standard JSON payload parsing
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
            // Delhivery uses Authorization token in header for webhook verification
            verificationStrategy: VerificationStrategy.API_KEY,
            apiKeyHeader: 'Authorization',
            secretKey: process.env.DELHIVERY_WEBHOOK_SECRET
        };

        super(config);
    }

    /**
     * Parse Delhivery-specific webhook payload
     * 
     * Payload structure:
     * {
     *   "Shipment": {
     *     "AWB": "1234567890",
     *     "Status": {
     *       "Status": "In Transit",
     *       "StatusType": "UD",
     *       ...
     *     }
     *   }
     * }
     */
    parseWebhook(req: Request): WebhookPayload {
        const body = req.body;
        // Handle both casing structure if needed, usually it's "Shipment"
        const shipment = body.Shipment || body.shipment || body;

        if (!shipment) {
            throw new Error('Invalid payload: Missing Shipment object');
        }

        const statusObj = shipment.Status || {};
        // AWB might be nested or direct depending on payload version
        const awb = shipment.AWB || shipment.waybill || body.awb;

        if (!awb) {
            throw new Error('Invalid payload: Missing AWB');
        }

        return {
            courier: 'delhivery',
            awb: String(awb),
            event: statusObj.StatusType || 'status_update',
            status: statusObj.Status || 'UNKNOWN',
            timestamp: statusObj.StatusDateTime
                ? new Date(statusObj.StatusDateTime)
                : new Date(),
            rawPayload: body,
            metadata: {
                statusType: statusObj.StatusType,
                location: statusObj.StatusLocation,
                instructions: statusObj.Instructions || statusObj.Remarks,
                scanTime: statusObj.StatusDateTime,
                nslCode: shipment.NSLCode,
                refId: shipment.ReferenceNo,
                codAmount:
                    shipment.CODAmount ||
                    shipment.CodAmount ||
                    statusObj.CODAmount ||
                    body.cod_amount ||
                    body.codAmount,
                paymentMode: shipment.PaymentMode || statusObj.PaymentMode || body.payment_mode,
            }
        };
    }

    /**
     * Process webhook with real-time NDR detection
     * Overrides base handler to check for NDR before status mapping
     */
    async handleWebhook(payload: WebhookPayload): Promise<void> {
        // Check for NDR using Delhivery-specific patterns
        if (this.isNDREvent(payload)) {
            await this.triggerNDRDetection(payload);
        }

        // Continue with standard webhook processing
        await super.handleWebhook(payload);
    }

    /**
     * Check if webhook payload indicates an NDR event
     * Delhivery uses StatusType field (UD, NDR, RT) for categorization
     */
    private isNDREvent(payload: WebhookPayload): boolean {
        const patterns = this.getNDRPatterns();
        const status = payload.status.toUpperCase();
        const statusType = (payload.metadata?.statusType || '').toUpperCase();
        const remarks = (payload.metadata?.instructions || '').toLowerCase();

        // Delhivery's StatusType is the most reliable indicator
        if (patterns.statusCodes.some(code =>
            statusType.includes(code) || status.includes(code)
        )) {
            return true;
        }

        // Check keywords in instructions/remarks
        return patterns.keywords.some(keyword => remarks.includes(keyword));
    }

    /**
     * Get Delhivery-specific NDR patterns
     */
    protected getNDRPatterns() {
        return {
            statusCodes: ['NDR', 'UNDELIVERED', 'UD', 'FAILED', 'RT', 'RTO'],
            keywords: [
                'customer refused',
                'shipment refused',
                'customer not home',
                'no one available',
                'not available',
                'incomplete address',
                'wrong address',
                'address not found',
                'customer unreachable',
                'phone switched off',
                'reschedule requested',
                'customer denied',
                'cod not ready',
                'entry restricted'
            ]
        };
    }
}
