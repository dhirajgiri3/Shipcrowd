import { Router } from 'express';
import ProductMappingController from '../../../controllers/integrations/product-mapping.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/auth/unified-access';

/**
 * Product Mapping Routes
 *
 * All routes require authentication
 *
 * Base path: /api/v1/integrations/shopify
 */

const router = Router();

/**
 * Auto-mapping route
 */
router.post(
  '/stores/:id/mappings/auto',
  authenticate,
  requireAccess({ roles: ['admin'], teamRoles: ['owner', 'warehouse_manager'], kyc: true }),
  ProductMappingController.autoMapProducts
);

/**
 * CSV import/export routes
 */
router.post(
  '/stores/:id/mappings/import',
  authenticate,
  requireAccess({ roles: ['admin'], teamRoles: ['owner', 'warehouse_manager'], kyc: true }),
  ProductMappingController.importCSV
);

router.get(
  '/stores/:id/mappings/export',
  authenticate,
  requireAccess({ roles: ['admin'], teamRoles: ['owner', 'warehouse_manager'], kyc: true }),
  ProductMappingController.exportCSV
);

/**
 * Statistics route
 */
router.get(
  '/stores/:id/mappings/stats',
  authenticate,
  requireAccess({ kyc: true }),
  ProductMappingController.getStats
);

/**
 * List and create mappings
 */
router.get(
  '/stores/:id/mappings',
  authenticate,
  ProductMappingController.listMappings
);

router.post(
  '/stores/:id/mappings',
  authenticate,
  requireAccess({ roles: ['admin'], teamRoles: ['owner', 'warehouse_manager'], kyc: true }),
  ProductMappingController.createMapping
);

/**
 * Individual mapping operations
 */
router.delete(
  '/mappings/:id',
  authenticate,
  requireAccess({ roles: ['admin'], teamRoles: ['owner', 'warehouse_manager'], kyc: true }),
  ProductMappingController.deleteMapping
);

router.post(
  '/mappings/:id/toggle',
  authenticate,
  requireAccess({ roles: ['admin'], teamRoles: ['owner', 'warehouse_manager'], kyc: true }),
  ProductMappingController.toggleStatus
);

router.post(
  '/mappings/:id/sync',
  authenticate,
  requireAccess({ roles: ['admin'], teamRoles: ['owner', 'warehouse_manager'], kyc: true }),
  ProductMappingController.syncInventory
);

export default router;
