import { Router } from 'express';
import FlipkartController from '../../../controllers/integrations/flipkart.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { authorize } from '../../../middleware/auth/auth';

/**
 * Flipkart Integration Routes
 *
 * All routes require authentication
 *
 * Base path: /api/v1/integrations/flipkart
 */

const router = Router();

/**
 * Connection Routes
 */

// Connect Flipkart seller account
router.post(
  '/connect',
  authenticate,
  authorize(['ADMIN', 'COMPANY_OWNER']), // Only admins can connect
  FlipkartController.connect
);

/**
 * Store Management Routes
 */

// List all connected stores
router.get(
  '/stores',
  authenticate,
  FlipkartController.listStores
);

// Get specific store details
router.get(
  '/stores/:id',
  authenticate,
  FlipkartController.getStore
);

// Disconnect store
router.delete(
  '/stores/:id',
  authenticate,
  authorize(['ADMIN', 'COMPANY_OWNER']), // Only admins can disconnect
  FlipkartController.disconnectStore
);

// Test store connection
router.post(
  '/stores/:id/test',
  authenticate,
  FlipkartController.testConnection
);

// Pause sync
router.post(
  '/stores/:id/pause',
  authenticate,
  authorize(['ADMIN', 'COMPANY_OWNER']),
  FlipkartController.pauseSync
);

// Resume sync
router.post(
  '/stores/:id/resume',
  authenticate,
  authorize(['ADMIN', 'COMPANY_OWNER']),
  FlipkartController.resumeSync
);

export default router;
