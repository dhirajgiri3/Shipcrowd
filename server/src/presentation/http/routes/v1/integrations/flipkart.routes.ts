import { Router } from 'express';
import FlipkartController from '../../../controllers/integrations/flipkart.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/auth/unified-access';

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
  requireAccess({ roles: ['admin'], teamRoles: ['owner'], kyc: true }),
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
  requireAccess({ roles: ['admin'], teamRoles: ['owner'], kyc: true }),
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
  requireAccess({ roles: ['admin'], teamRoles: ['owner'], kyc: true }),
  FlipkartController.pauseSync
);

// Resume sync
router.post(
  '/stores/:id/resume',
  authenticate,
  requireAccess({ roles: ['admin'], teamRoles: ['owner'], kyc: true }),
  FlipkartController.resumeSync
);

export default router;
