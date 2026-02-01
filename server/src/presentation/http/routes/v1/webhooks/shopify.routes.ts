import { Router } from 'express';
import express from 'express';
import ShopifyWebhookController from '../../../controllers/webhooks/channels/shopify.webhook.controller';
import { verifyShopifyWebhook, captureRawBody } from '../../../middleware/webhooks/shopify-webhook-auth.middleware';

/**
 * Shopify Webhook Routes
 *
 * Public endpoints (HMAC-verified via middleware)
 *
 * Base path: /api/v1/webhooks/shopify
 *
 * IMPORTANT: These routes require raw body for HMAC verification.
 * Must use express.raw() middleware instead of express.json()
 */

const router = Router();

// Use raw body parser for HMAC verification
const rawBodyParser = express.raw({
  type: 'application/json',
  verify: captureRawBody,
});

// Middleware to parse raw body to JSON after verification
const parseJSONAfterVerification = (req: any, res: any, next: any) => {
  try {
    if (req.rawBody) {
      req.body = JSON.parse(req.rawBody);
    }
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid JSON' });
  }
};

/**
 * Order Webhooks
 */
router.post(
  '/orders/create',
  rawBodyParser,
  verifyShopifyWebhook,
  parseJSONAfterVerification,
  ShopifyWebhookController.handleOrderCreate
);

router.post(
  '/orders/updated',
  rawBodyParser,
  verifyShopifyWebhook,
  parseJSONAfterVerification,
  ShopifyWebhookController.handleOrderUpdated
);

router.post(
  '/orders/cancelled',
  rawBodyParser,
  verifyShopifyWebhook,
  parseJSONAfterVerification,
  ShopifyWebhookController.handleOrderCancelled
);

router.post(
  '/orders/fulfilled',
  rawBodyParser,
  verifyShopifyWebhook,
  parseJSONAfterVerification,
  ShopifyWebhookController.handleOrderFulfilled
);

/**
 * Product & Inventory Webhooks
 */
router.post(
  '/products/update',
  rawBodyParser,
  verifyShopifyWebhook,
  parseJSONAfterVerification,
  ShopifyWebhookController.handleProductUpdate
);

router.post(
  '/inventory_levels/update',
  rawBodyParser,
  verifyShopifyWebhook,
  parseJSONAfterVerification,
  ShopifyWebhookController.handleInventoryUpdate
);

/**
 * App & Shop Webhooks
 */
router.post(
  '/app/uninstalled',
  rawBodyParser,
  verifyShopifyWebhook,
  parseJSONAfterVerification,
  ShopifyWebhookController.handleAppUninstalled
);

router.post(
  '/shop/update',
  rawBodyParser,
  verifyShopifyWebhook,
  parseJSONAfterVerification,
  ShopifyWebhookController.handleShopUpdate
);

export default router;
