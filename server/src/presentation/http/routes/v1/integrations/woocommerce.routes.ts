/**
 * WooCommerce Integration Routes
 *
 * API routes for WooCommerce store management:
 * - Store installation and authentication
 * - Store listing and details
 * - Connection testing
 * - Store disconnection
 * - Sync control (pause/resume)
 * - Credential management
 * - Webhook management
 */

import { Router } from 'express';
import WooCommerceController from '../../../controllers/integrations/woocommerce.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { authorize } from '../../../middleware/auth/auth';
import { checkKYC } from '../../../middleware/auth/kyc';

const router = Router();

/**
 * All WooCommerce routes require authentication
 */
router.use(authenticate);
router.use(checkKYC);

/**
 * Store Management Routes
 */

/**
 * POST /api/v1/integrations/woocommerce/install
 * Install (connect) a new WooCommerce store
 *
 * Access: Admin, Company Owner
 *
 * Body:
 * {
 *   "storeUrl": "https://example.com",
 *   "consumerKey": "ck_...",
 *   "consumerSecret": "cs_...",
 *   "storeName": "My Store" (optional)
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "WooCommerce store connected successfully",
 *   "store": { id, storeUrl, storeName, ... }
 * }
 */
router.post(
  '/install',
  authorize(['ADMIN', 'COMPANY_OWNER']),
  WooCommerceController.installStore
);

/**
 * GET /api/v1/integrations/woocommerce/stores
 * List all connected WooCommerce stores for the company
 *
 * Access: Authenticated users
 *
 * Response:
 * {
 *   "success": true,
 *   "count": 2,
 *   "stores": [...]
 * }
 */
router.get('/stores', WooCommerceController.listStores);

/**
 * GET /api/v1/integrations/woocommerce/stores/:id
 * Get detailed information about a specific store
 *
 * Access: Authenticated users
 *
 * Response:
 * {
 *   "success": true,
 *   "store": { id, storeUrl, syncConfig, webhooks, stats, ... }
 * }
 */
router.get('/stores/:id', WooCommerceController.getStoreDetails);

/**
 * POST /api/v1/integrations/woocommerce/stores/:id/test
 * Test connection to WooCommerce store
 *
 * Access: Authenticated users
 *
 * Response:
 * {
 *   "success": true,
 *   "connected": true,
 *   "message": "Connection is valid"
 * }
 */
router.post('/stores/:id/test', WooCommerceController.testConnection);

/**
 * DELETE /api/v1/integrations/woocommerce/stores/:id
 * Disconnect WooCommerce store and unregister webhooks
 *
 * Access: Admin, Company Owner
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "WooCommerce store disconnected successfully"
 * }
 */
router.delete(
  '/stores/:id',
  authorize(['ADMIN', 'COMPANY_OWNER']),
  WooCommerceController.disconnectStore
);

/**
 * Sync Control Routes
 */

/**
 * POST /api/v1/integrations/woocommerce/stores/:id/pause
 * Pause automatic syncing for a store
 *
 * Access: Admin, Company Owner
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Sync paused successfully"
 * }
 */
router.post(
  '/stores/:id/pause',
  authorize(['ADMIN', 'COMPANY_OWNER']),
  WooCommerceController.pauseSync
);

/**
 * POST /api/v1/integrations/woocommerce/stores/:id/resume
 * Resume automatic syncing for a store
 *
 * Access: Admin, Company Owner
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Sync resumed successfully"
 * }
 */
router.post(
  '/stores/:id/resume',
  authorize(['ADMIN', 'COMPANY_OWNER']),
  WooCommerceController.resumeSync
);

/**
 * Credential Management Routes
 */

/**
 * PUT /api/v1/integrations/woocommerce/stores/:id/credentials
 * Update WooCommerce API credentials
 *
 * Access: Admin, Company Owner
 *
 * Body:
 * {
 *   "consumerKey": "ck_...",
 *   "consumerSecret": "cs_..."
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Credentials updated successfully"
 * }
 */
router.put(
  '/stores/:id/credentials',
  authorize(['ADMIN', 'COMPANY_OWNER']),
  WooCommerceController.refreshCredentials
);

/**
 * Webhook Management Routes
 */

/**
 * POST /api/v1/integrations/woocommerce/stores/:id/webhooks/register
 * Re-register all webhooks for a store
 *
 * Access: Admin, Company Owner
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Registered 8 out of 8 webhooks",
 *   "results": [...]
 * }
 */
router.post(
  '/stores/:id/webhooks/register',
  authorize(['ADMIN', 'COMPANY_OWNER']),
  WooCommerceController.registerWebhooks
);

/**
 * Order Sync Routes
 */

/**
 * POST /api/v1/integrations/woocommerce/stores/:id/sync/orders
 * Trigger manual order sync for a store
 *
 * Access: Admin, Company Owner
 *
 * Body (optional):
 * {
 *   "hoursBack": 24
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Order sync queued successfully",
 *   "jobId": "..."
 * }
 */
router.post(
  '/stores/:id/sync/orders',
  authorize(['ADMIN', 'COMPANY_OWNER']),
  WooCommerceController.syncOrders
);

/**
 * GET /api/v1/integrations/woocommerce/sync/jobs/:jobId
 * Get status of a sync job
 *
 * Access: Authenticated users
 *
 * Response:
 * {
 *   "success": true,
 *   "job": { id, state, progress, ... }
 * }
 */
router.get('/sync/jobs/:jobId', WooCommerceController.getSyncJobStatus);

/**
 * Fulfillment Routes
 */

/**
 * PUT /api/v1/integrations/woocommerce/stores/:storeId/orders/:orderId/status
 * Update order status in WooCommerce (e.g., mark as shipped/completed)
 *
 * Access: Admin, Company Owner, Manager
 *
 * Body:
 * {
 *   "status": "processing" | "completed" | "cancelled",
 *   "awbNumber": "1234567890",
 *   "courierName": "Delhivery",
 *   "trackingUrl": "https://..." (optional)
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Order status updated in WooCommerce"
 * }
 */
router.put(
  '/stores/:storeId/orders/:orderId/status',
  authorize(['ADMIN', 'COMPANY_OWNER', 'MANAGER']),
  WooCommerceController.updateOrderStatus
);

/**
 * POST /api/v1/integrations/woocommerce/stores/:storeId/orders/:orderId/tracking
 * Add tracking note to WooCommerce order
 *
 * Access: Admin, Company Owner, Manager
 *
 * Body:
 * {
 *   "awbNumber": "1234567890",
 *   "courierName": "Delhivery",
 *   "trackingUrl": "https://..." (optional),
 *   "customerNote": true (optional)
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Tracking note added to order"
 * }
 */
router.post(
  '/stores/:storeId/orders/:orderId/tracking',
  authorize(['ADMIN', 'COMPANY_OWNER', 'MANAGER']),
  WooCommerceController.addTrackingNote
);

/**
 * POST /api/v1/integrations/woocommerce/stores/:id/sync/fulfillments
 * Sync pending status updates to WooCommerce (bulk)
 *
 * Access: Admin, Company Owner
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Synced 5 orders to WooCommerce",
 *   "syncedCount": 5
 * }
 */
router.post(
  '/stores/:id/sync/fulfillments',
  authorize(['ADMIN', 'COMPANY_OWNER']),
  WooCommerceController.syncPendingUpdates
);

export default router;
