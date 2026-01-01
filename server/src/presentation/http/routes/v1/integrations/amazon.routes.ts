import { Router } from 'express';
import AmazonController from '../../../controllers/integrations/amazon.controller';
import amazonProductMappingRoutes from './amazonProductMapping.routes';
import { authenticate } from '../../../middleware/auth/auth';
import { authorize } from '../../../middleware/auth/auth';

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

// Connect Amazon seller account
router.post(
    '/connect',
    authenticate,
    authorize(['ADMIN', 'COMPANY_OWNER']), // Only admins can connect
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

// Disconnect store
router.delete(
    '/stores/:id',
    authenticate,
    authorize(['ADMIN', 'COMPANY_OWNER']), // Only admins can disconnect
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
    authorize(['ADMIN', 'COMPANY_OWNER']),
    AmazonController.pauseSync
);

// Resume sync
router.post(
    '/stores/:id/resume',
    authenticate,
    authorize(['ADMIN', 'COMPANY_OWNER']),
    AmazonController.resumeSync
);

// Manual order sync
router.post(
    '/stores/:id/sync-orders',
    authenticate,
    authorize(['ADMIN', 'COMPANY_OWNER']),
    AmazonController.syncOrders
);

// Refresh credentials
router.post(
    '/stores/:id/refresh',
    authenticate,
    authorize(['ADMIN', 'COMPANY_OWNER']),
    AmazonController.refreshCredentials
);

/**
 * Product Mapping Routes (nested under stores/:storeId)
 */
router.use('/stores/:storeId/mappings', amazonProductMappingRoutes);

export default router;
