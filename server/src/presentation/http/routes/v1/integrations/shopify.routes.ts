import { Router } from 'express';
import ShopifyController from '../../../controllers/integrations/shopify.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/index';
import { AccessTier } from '../../../../../core/domain/types/access-tier';

/**
 * Shopify Integration Routes
 * All routes require authentication except callback
 */

const router = Router();

// Initiate OAuth installation
router.get(
  '/install',
  authenticate,
  requireAccess({
    tier: AccessTier.PRODUCTION,
    kyc: false,
    teamRoles: ['owner', 'admin']
  }),
  ShopifyController.install
);

// OAuth callback (public)
router.get('/callback', ShopifyController.callback);

// List all connected stores
router.get(
  '/stores',
  authenticate,
  requireAccess({ tier: AccessTier.SANDBOX }),
  ShopifyController.listStores
);

// Get specific store details
router.get(
  '/stores/:id',
  authenticate,
  requireAccess({ tier: AccessTier.SANDBOX }),
  ShopifyController.getStore
);

// Disconnect store
router.delete(
  '/stores/:id',
  authenticate,
  requireAccess({
    tier: AccessTier.PRODUCTION,
    kyc: true,
    teamRoles: ['owner', 'admin']
  }),
  ShopifyController.disconnectStore
);

// Test store connection
router.post(
  '/stores/:id/test',
  authenticate,
  requireAccess({ tier: AccessTier.SANDBOX }),
  ShopifyController.testConnection
);

// Pause sync
router.post(
  '/stores/:id/pause',
  authenticate,
  requireAccess({ teamRoles: ['owner', 'admin'] }),
  ShopifyController.pauseSync
);

// Resume sync
router.post(
  '/stores/:id/resume',
  authenticate,
  requireAccess({ teamRoles: ['owner', 'admin'] }),
  ShopifyController.resumeSync
);

/**
 * Fulfillment Routes
 */

// Create fulfillment in Shopify (push tracking)
router.post(
  '/stores/:storeId/orders/:orderId/fulfill',
  authenticate,
  requireAccess({
    tier: AccessTier.PRODUCTION,
    kyc: true,
    teamRoles: ['owner', 'admin', 'manager']
  }),
  ShopifyController.createFulfillment
);

// Update tracking on existing fulfillment
router.put(
  '/stores/:storeId/fulfillments/:fulfillmentId',
  authenticate,
  requireAccess({
    tier: AccessTier.PRODUCTION,
    kyc: true,
    teamRoles: ['owner', 'admin', 'manager']
  }),
  ShopifyController.updateFulfillmentTracking
);

// Trigger manual order sync
router.post(
  '/stores/:id/sync/orders',
  authenticate,
  requireAccess({ teamRoles: ['owner', 'admin'] }),
  ShopifyController.syncOrders
);

// Sync pending fulfillments (bulk)
router.post(
  '/stores/:id/sync/fulfillments',
  authenticate,
  requireAccess({ teamRoles: ['owner', 'admin'] }),
  ShopifyController.syncPendingFulfillments
);

export default router;
