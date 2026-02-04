import { Router } from 'express';
import AmazonController from '../../../controllers/integrations/amazon.controller';
import amazonProductMappingRoutes from './amazon-product-mapping.routes';
import { authenticate } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/auth/unified-access';

/**
 * Amazon Integration Routes
 *
 * All routes require authentication
 *
 * Base path: /api/v1/integrations/amazon
 */

const router = Router();

/**
 * Connection Routes
 */

// Test Amazon credentials before connect
router.post(
    '/test',
    authenticate,
    requireAccess({ roles: ['admin'], teamRoles: ['owner'], kyc: true }),
    AmazonController.testConnectionCredentials
);

// Connect Amazon seller account
router.post(
    '/connect',
    authenticate,
    requireAccess({ roles: ['admin'], teamRoles: ['owner'], kyc: true }),
    AmazonController.connect
);

/**
 * Store Management Routes
 */

// List all connected stores
router.get(
    '/stores',
    authenticate,
    AmazonController.listStores
);

// Get specific store details
router.get(
    '/stores/:id',
    authenticate,
    AmazonController.getStore
);

// Update store settings
router.patch(
    '/stores/:id/settings',
    authenticate,
    requireAccess({ roles: ['admin'], teamRoles: ['owner'], kyc: true }),
    AmazonController.updateSettings
);

// Disconnect store
router.delete(
    '/stores/:id',
    authenticate,
    requireAccess({ roles: ['admin'], teamRoles: ['owner'], kyc: true }),
    AmazonController.disconnectStore
);

// Test store connection
router.post(
    '/stores/:id/test',
    authenticate,
    AmazonController.testConnection
);

// Pause sync
router.post(
    '/stores/:id/pause',
    authenticate,
    requireAccess({ roles: ['admin'], teamRoles: ['owner'], kyc: true }),
    AmazonController.pauseSync
);

// Resume sync
router.post(
    '/stores/:id/resume',
    authenticate,
    requireAccess({ roles: ['admin'], teamRoles: ['owner'], kyc: true }),
    AmazonController.resumeSync
);

// Manual order sync
router.post(
    '/stores/:id/sync-orders',
    authenticate,
    requireAccess({ roles: ['admin'], teamRoles: ['owner'], kyc: true }),
    AmazonController.syncOrders
);

// Refresh credentials
router.post(
    '/stores/:id/refresh',
    authenticate,
    requireAccess({ roles: ['admin'], teamRoles: ['owner'], kyc: true }),
    AmazonController.refreshCredentials
);

/**
 * Product Mapping Routes (nested under stores/:storeId)
 */
router.use('/stores/:storeId/mappings', amazonProductMappingRoutes);

export default router;
