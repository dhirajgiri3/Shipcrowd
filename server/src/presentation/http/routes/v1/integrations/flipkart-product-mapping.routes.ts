import { Router } from 'express';
import FlipkartProductMappingController from '../../../controllers/integrations/flipkart-product-mapping.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/auth/unified-access';

/**
 * Flipkart Product Mapping Routes
 *
 * All routes require authentication
 *
 * Base path: /api/v1/integrations/flipkart
 */

const router = Router({ mergeParams: true });

/**
 * Auto-mapping route
 */
router.post(
  '/auto',
  authenticate,
  requireAccess({ roles: ['admin'], teamRoles: ['owner', 'warehouse_manager'], kyc: true }),
  FlipkartProductMappingController.autoMapProducts
);

/**
 * CSV import/export routes
 */
router.post(
  '/import',
  authenticate,
  requireAccess({ roles: ['admin'], teamRoles: ['owner', 'warehouse_manager'], kyc: true }),
  FlipkartProductMappingController.importCSV
);

router.get(
  '/export',
  authenticate,
  requireAccess({ roles: ['admin'], teamRoles: ['owner', 'warehouse_manager'], kyc: true }),
  FlipkartProductMappingController.exportCSV
);

/**
 * Statistics route
 */
router.get(
  '/stats',
  authenticate,
  requireAccess({ kyc: true }),
  FlipkartProductMappingController.getStats
);

/**
 * List and create mappings
 */
router.get(
  '/',
  authenticate,
  FlipkartProductMappingController.listMappings
);

router.post(
  '/',
  authenticate,
  requireAccess({ roles: ['admin'], teamRoles: ['owner', 'warehouse_manager'], kyc: true }),
  FlipkartProductMappingController.createMapping
);

/**
 * Individual mapping operations
 */
router.delete(
  '/:id',
  authenticate,
  requireAccess({ roles: ['admin'], teamRoles: ['owner', 'warehouse_manager'], kyc: true }),
  FlipkartProductMappingController.deleteMapping
);

router.post(
  '/:id/toggle',
  authenticate,
  requireAccess({ roles: ['admin'], teamRoles: ['owner', 'warehouse_manager'], kyc: true }),
  FlipkartProductMappingController.toggleStatus
);

router.post(
  '/:id/sync',
  authenticate,
  requireAccess({ roles: ['admin'], teamRoles: ['owner', 'warehouse_manager'], kyc: true }),
  FlipkartProductMappingController.syncInventory
);

export default router;
