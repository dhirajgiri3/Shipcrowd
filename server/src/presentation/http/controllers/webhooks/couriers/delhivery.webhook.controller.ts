import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../../../../shared/utils/responseHelper';
import { ValidationError } from '../../../../../shared/errors/app.error';
import { DelhiveryWebhookHandler } from '../../../../../core/application/services/courier/webhooks/handlers/index';
import logger from '../../../../../shared/logger/winston.logger';

/**
 * DelhiveryWebhookController
 *
 * Handles incoming webhooks from Delhivery.
 * Endpoint: POST /webhooks/couriers/delhivery
 * 
 * Uses the unified BaseWebhookHandler architecture for:
 * - Authorization Token verification
 * - Idempotency handling
 * - Status mapping via StatusMapperService
 * - Automatic shipment updates
 */
export class DelhiveryWebhookController {
    private static handler = new DelhiveryWebhookHandler();

    /**
     * Handle incoming webhook event
     */
    static async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // 1. Verify signature/token
            const isValid = this.handler.verifySignature(req);
            if (!isValid) {
                // For polling/legacy compatibility, we might log warning instead of failing?
                // But for security, we should enforce it if configured.
                // If DELHIVERY_WEBHOOK_SECRET is not set, verifySignature might return true (check BaseHandler).
                throw new ValidationError('Invalid webhook signature/token');
            }

            // 2. Parse webhook payload
            const payload = this.handler.parseWebhook(req);

            // 3. Process webhook (updates DB, triggers events)
            await this.handler.handleWebhook(payload);

            // 4. Send success response
            sendSuccess(res, {
                status: 'success',
                message: 'Webhook processed successfully'
            });

        } catch (error) {
            logger.error('Delhivery webhook error', { error });
            next(error);
        }
    }
}

export default DelhiveryWebhookController;
