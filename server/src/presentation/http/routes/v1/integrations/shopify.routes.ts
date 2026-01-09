import { Router } from 'express';
import ShopifyController from '../../../controllers/integrations/shopify.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { authorize } from '../../../middleware/auth/auth';

/**
 * Shopify Integration Routes
 *
 * All routes require authentication except callback (handled via state verification)
 *
 * Base path: /api/v1/integrations/shopify
 */

const router = Router();

/**
 * OAuth Flow Routes
 */

// Initiate OAuth installation
router.get(
  '/install',
  authenticate,
  authorize(['ADMIN', 'COMPANY_OWNER']), // Only admins can install
  ShopifyController.install
);

// OAuth callback (public, verified via HMAC)
router.get('/callback', ShopifyController.callback);

/**
 * Store Management Routes
 */

// List all connected stores
router.get(
  '/stores',
  authenticate,
  ShopifyController.listStores
);

// Get specific store details
router.get(
  '/stores/:id',
  authenticate,
  ShopifyController.getStore
);

// Disconnect store
router.delete(
  '/stores/:id',
  authenticate,
  authorize(['ADMIN', 'COMPANY_OWNER']), // Only admins can disconnect
  ShopifyController.disconnectStore
);

// Test store connection
router.post(
  '/stores/:id/test',
  authenticate,
  ShopifyController.testConnection
);

// Pause sync
router.post(
  '/stores/:id/pause',
  authenticate,
  authorize(['ADMIN', 'COMPANY_OWNER']),
  ShopifyController.pauseSync
);

// Resume sync
router.post(
  '/stores/:id/resume',
  authenticate,
  authorize(['ADMIN', 'COMPANY_OWNER']),
  ShopifyController.resumeSync
);

/**
 * Fulfillment Routes
 */

// Create fulfillment in Shopify (push tracking)
router.post(
  '/stores/:storeId/orders/:orderId/fulfill',
  authenticate,
  authorize(['ADMIN', 'COMPANY_OWNER', 'MANAGER']),
  ShopifyController.createFulfillment
);

// Update tracking on existing fulfillment
router.put(
  '/stores/:storeId/fulfillments/:fulfillmentId',
  authenticate,
  authorize(['ADMIN', 'COMPANY_OWNER', 'MANAGER']),
  ShopifyController.updateFulfillmentTracking
);

// Trigger manual order sync
router.post(
  '/stores/:id/sync/orders',
  authenticate,
  authorize(['ADMIN', 'COMPANY_OWNER']),
  ShopifyController.syncOrders
);

// Sync pending fulfillments (bulk)
router.post(
  '/stores/:id/sync/fulfillments',
  authenticate,
  authorize(['ADMIN', 'COMPANY_OWNER']),
  ShopifyController.syncPendingFulfillments
);

export default router;
