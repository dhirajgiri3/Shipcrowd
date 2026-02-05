import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../../../../shared/utils/responseHelper';
import { ValidationError } from '../../../../../shared/errors/app.error';
import { VelocityWebhookService } from '../../../../../infrastructure/external/couriers/velocity/velocity-webhook.service';

/**
 * VelocityWebhookController
 *
 * Handles incoming webhooks from Velocity Courier.
 * Endpoint: POST /webhooks/couriers/velocity
 * 
 * Uses specialized VelocityWebhookService for processing to handle
 * all event types including status updates and creation events.
 */
export class VelocityWebhookController {
    /**
     * Handle incoming webhook event
     */
    static async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const payload = req.body;

            // Basic payload validation
            if (!payload) {
                throw new ValidationError('Invalid payload: Missing body');
            }

            // Process webhook using specialized Velocity service
            const result = await VelocityWebhookService.processWebhook(payload);

            // Send appropriate response based on result
            // We generally return success to the webhook provider to prevent retries
            // unless it's a transient system error (handled by middleware/global handler)
            sendSuccess(res, {
                status: result.success ? 'success' : 'processed_with_warnings',
                message: result.message
            });

        } catch (error) {
            next(error);
        }
    }
}

export default VelocityWebhookController;
