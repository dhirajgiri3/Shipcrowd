import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../../../../shared/utils/responseHelper';
import { ValidationError } from '../../../../../shared/errors/app.error';
import { VelocityWebhookHandler } from '../../../../../core/application/services/courier/webhooks/handlers/index';
import logger from '../../../../../shared/logger/winston.logger';

/**
 * VelocityWebhookController
 *
 * Handles incoming webhooks from Velocity Courier.
 * Endpoint: POST /webhooks/couriers/velocity
 * 
 * Uses the unified BaseWebhookHandler architecture for:
 * - API key verification
 * - Idempotency handling
 * - Real-time NDR detection
 * - Status mapping via StatusMapperService
 * - Automatic shipment updates
 */
export class VelocityWebhookController {
    private static handler = new VelocityWebhookHandler();

    /**
     * Handle incoming webhook event
     */
    static async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // 1. Verify API key
            const isValid = VelocityWebhookController.handler.verifySignature(req);
            if (!isValid) {
                throw new ValidationError('Invalid webhook API key');
            }

            // 2. Parse webhook payload
            const payload = VelocityWebhookController.handler.parseWebhook(req);

            // 3. Process webhook (includes real-time NDR detection, DB updates, triggers events)
            await VelocityWebhookController.handler.handleWebhook(payload);

            // 4. Send success response
            sendSuccess(res, {
                status: 'success',
                message: 'Webhook processed successfully'
            });

        } catch (error) {
            logger.error('Velocity webhook error', { error });
            next(error);
        }
    }
}

export default VelocityWebhookController;
