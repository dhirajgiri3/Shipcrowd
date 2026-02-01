/**
 * Return Webhook Routes
 * 
 * Webhook endpoints for receiving courier pickup status updates
 */

import { Router } from 'express';
import ReturnWebhookController from '@/presentation/http/controllers/logistics/return-webhook.controller';
import { apiRateLimiter } from '@/shared/config/rateLimit.config';

const router = Router();

/**
 * POST /webhooks/returns/courier/:courierId
 * Receive pickup status update from courier partner
 * 
 * Security: Signature verification in controller
 * Rate limit: 100 requests per 15 minutes
 */
router.post(
    '/courier/:courierId',
    apiRateLimiter,
    ReturnWebhookController.handleCourierUpdate
);

/**
 * POST /webhooks/returns/test
 * Test webhook endpoint (development only)
 * Allows testing without signature verification
 */
router.post(
    '/test',
    apiRateLimiter,
    ReturnWebhookController.testWebhook
);

export default router;
