import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../../../../shared/utils/responseHelper';
import { ValidationError } from '../../../../../shared/errors/app.error';
import { WebhookProcessorService } from '../../../../../core/application/services/courier/webhook-processor.service';
import { VelocityStatusMapper } from '../../../../../infrastructure/external/couriers/velocity/velocity-status.mapper';

/**
 * VelocityWebhookController
 *
 * Handles incoming webhooks from Velocity Courier.
 * Endpoint: POST /webhooks/couriers/velocity
 * 
 * Now uses the generic WebhookProcessorService for standardized webhook handling
 */
export class VelocityWebhookController {
    private static mapper = new VelocityStatusMapper();

    /**
     * Handle incoming webhook event
     */
    static async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const payload = req.body;

            // Basic payload validation
            if (!payload || !payload.awb) {
                throw new ValidationError('Invalid payload: Missing AWB');
            }

            // Process webhook using generic processor
            const result = await WebhookProcessorService.processWebhook(
                this.mapper,
                payload
            );

            // Send appropriate response based on result
            if (result.success) {
                sendSuccess(res, {
                    status: result.status,
                    message: result.message
                });
            } else {
                // Return 200 even on errors to prevent webhook retries for operational issues
                sendSuccess(res, {
                    status: result.status,
                    message: result.message
                });
            }

        } catch (error) {
            next(error);
        }
    }
}

export default VelocityWebhookController;
