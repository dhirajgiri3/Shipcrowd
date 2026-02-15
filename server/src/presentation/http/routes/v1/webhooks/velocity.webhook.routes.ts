import { Router } from 'express';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import { VelocityWebhookController } from '../../../controllers/webhooks/couriers/velocity.webhook.controller';
import { verifyWebhookSignature } from '../../../middleware/webhooks/webhook-signature.middleware';

const router = Router();

/**
 * POST /
 * Handle incoming Velocity webhooks
 */
router.post(
  '/',
  (req, res, next) => verifyWebhookSignature('velocity')(req, res, next),
  asyncHandler(VelocityWebhookController.handleWebhook)
);

/**
 * GET /health
 * internal health check
 */
router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'velocity-webhook' });
});

export default router;
