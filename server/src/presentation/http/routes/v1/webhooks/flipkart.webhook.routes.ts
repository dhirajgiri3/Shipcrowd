import { Router } from 'express';
import express from 'express';
import FlipkartWebhookController from '../../../controllers/webhooks/flipkart.webhook.controller';
import { verifyFlipkartWebhook, rawBodyParser } from '../../../middleware/webhooks/flipkartWebhookAuth';

/**
 * Flipkart Webhook Routes
 *
 * Public endpoints (HMAC-verified via middleware)
 *
 * Base path: /api/v1/webhooks/flipkart
 *
 * IMPORTANT: These routes require raw body for HMAC verification.
 * Must use raw body parser instead of express.json()
 */

const router = Router();

/**
 * Order Webhooks
 */
router.post(
  '/order/create',
  rawBodyParser,
  verifyFlipkartWebhook,
  FlipkartWebhookController.handleOrderCreate
);

router.post(
  '/order/approve',
  rawBodyParser,
  verifyFlipkartWebhook,
  FlipkartWebhookController.handleOrderApprove
);

router.post(
  '/order/ready-to-dispatch',
  rawBodyParser,
  verifyFlipkartWebhook,
  FlipkartWebhookController.handleOrderReadyToDispatch
);

router.post(
  '/order/dispatch',
  rawBodyParser,
  verifyFlipkartWebhook,
  FlipkartWebhookController.handleOrderDispatch
);

router.post(
  '/order/deliver',
  rawBodyParser,
  verifyFlipkartWebhook,
  FlipkartWebhookController.handleOrderDeliver
);

router.post(
  '/order/cancel',
  rawBodyParser,
  verifyFlipkartWebhook,
  FlipkartWebhookController.handleOrderCancel
);

router.post(
  '/order/return',
  rawBodyParser,
  verifyFlipkartWebhook,
  FlipkartWebhookController.handleOrderReturn
);

/**
 * Inventory Webhook
 */
router.post(
  '/inventory/update',
  rawBodyParser,
  verifyFlipkartWebhook,
  FlipkartWebhookController.handleInventoryUpdate
);

export default router;
