import { Router } from 'express';
import AmazonController from '../../../controllers/integrations/amazon.controller';
import amazonProductMappingRoutes from './amazon-product-mapping.routes';
import { authenticate } from '../../../middleware/auth/auth';
import { authorize } from '../../../middleware/auth/auth';
import { checkKYC } from '../../../middleware/auth/kyc';

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
    checkKYC,
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
    checkKYC,
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
    checkKYC,
    authorize(['ADMIN', 'COMPANY_OWNER']),
    AmazonController.pauseSync
);

// Resume sync
router.post(
    '/stores/:id/resume',
    authenticate,
    checkKYC,
    authorize(['ADMIN', 'COMPANY_OWNER']),
    AmazonController.resumeSync
);

// Manual order sync
router.post(
    '/stores/:id/sync-orders',
    authenticate,
    checkKYC,
    authorize(['ADMIN', 'COMPANY_OWNER']),
    AmazonController.syncOrders
);

// Refresh credentials
router.post(
    '/stores/:id/refresh',
    authenticate,
    checkKYC,
    authorize(['ADMIN', 'COMPANY_OWNER']),
    AmazonController.refreshCredentials
);

/**
 * Product Mapping Routes (nested under stores/:storeId)
 */
router.use('/stores/:storeId/mappings', amazonProductMappingRoutes);

export default router;
