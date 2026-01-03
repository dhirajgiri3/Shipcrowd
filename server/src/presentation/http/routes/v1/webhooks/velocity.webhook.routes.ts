/**
 * Velocity Webhook Routes
 *
 * Routes for handling Velocity Shipfast webhooks
 */

import { Router } from 'express';
import {
  handleVelocityWebhook,
  getWebhookMetrics,
  webhookHealthCheck
} from '../../../controllers/webhooks/velocity.webhook.controller';
import {
  verifyVelocityWebhookSignature,
  bypassWebhookVerification
} from '../../../middleware/webhooks/velocity-webhook-auth.middleware';
import { authenticate } from '../../../middleware/auth/auth';

const router = Router();

/**
 * POST /api/v1/webhooks/velocity
 * Handle incoming Velocity webhooks
 * Public endpoint - protected by HMAC signature verification
 */
router.post(
  '/',
  // Use signature verification in production, bypass in development if needed
  process.env.BYPASS_WEBHOOK_VERIFICATION === 'true'
    ? bypassWebhookVerification
    : verifyVelocityWebhookSignature,
  handleVelocityWebhook
);

/**
 * GET /api/v1/webhooks/velocity/health
 * Health check endpoint
 * Public endpoint
 */
router.get('/health', webhookHealthCheck);

/**
 * GET /api/v1/webhooks/velocity/metrics
 * Get webhook processing metrics
 * Protected endpoint - requires authentication
 */
router.get('/metrics', authenticate, getWebhookMetrics);

export default router;
