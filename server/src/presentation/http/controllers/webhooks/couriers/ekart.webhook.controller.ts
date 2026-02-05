import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../../../../shared/utils/responseHelper';
import { ValidationError } from '../../../../../shared/errors/app.error';
import { EkartWebhookHandler } from '../../../../../core/application/services/courier/webhooks/handlers/index';
import logger from '../../../../../shared/logger/winston.logger';

/**
 * EkartWebhookController
 *
 * Handles incoming webhooks from Ekart Logistics.
 * Endpoint: POST /webhooks/couriers/ekart
 * 
 * Uses the unified BaseWebhookHandler architecture for:
 * - HMAC signature verification
 * - Idempotency handling
 * - Status mapping via StatusMapperService
 * - Automatic shipment updates
 */
export class EkartWebhookController {
    private static handler = new EkartWebhookHandler();

    /**
     * Handle incoming webhook event
     */
    static async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // 1. Verify signature
            const isValid = this.handler.verifySignature(req);
            if (!isValid) {
                throw new ValidationError('Invalid webhook signature');
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
            logger.error('Ekart webhook error', { error });
            next(error);
        }
    }
}

export default EkartWebhookController;
