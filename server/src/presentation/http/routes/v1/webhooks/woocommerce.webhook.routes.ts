/**
 * WooCommerce Webhook Routes
 *
 * Public endpoints for WooCommerce webhook callbacks.
 * All routes require HMAC signature verification.
 */

import { Router } from 'express';
import WooCommerceWebhookController from '../../../controllers/webhooks/woocommerce.webhook.controller';
import { rawBodyParser, verifyWooCommerceWebhook } from '../../../middleware/webhooks/woocommerce-webhook-auth.middleware';

const router = Router();

/**
 * All webhook routes use raw body parser and HMAC verification
 */
router.use(rawBodyParser);
router.use(verifyWooCommerceWebhook);

/**
 * Order webhooks
 */
router.post('/order/created', WooCommerceWebhookController.handleOrderCreated);
router.post('/order/updated', WooCommerceWebhookController.handleOrderUpdated);
router.post('/order/deleted', WooCommerceWebhookController.handleOrderDeleted);

/**
 * Product webhooks
 */
router.post('/product/created', WooCommerceWebhookController.handleProductCreated);
router.post('/product/updated', WooCommerceWebhookController.handleProductUpdated);
router.post('/product/deleted', WooCommerceWebhookController.handleProductDeleted);

/**
 * Customer webhooks
 */
router.post('/customer/created', WooCommerceWebhookController.handleCustomerCreated);
router.post('/customer/updated', WooCommerceWebhookController.handleCustomerUpdated);

export default router;
