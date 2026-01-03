import { Router } from 'express';
import ProductMappingController from '../../../controllers/integrations/productMapping.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { authorize } from '../../../middleware/auth/auth';

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
  authorize(['ADMIN', 'COMPANY_OWNER', 'WAREHOUSE_MANAGER']),
  ProductMappingController.autoMapProducts
);

/**
 * CSV import/export routes
 */
router.post(
  '/stores/:id/mappings/import',
  authenticate,
  authorize(['ADMIN', 'COMPANY_OWNER', 'WAREHOUSE_MANAGER']),
  ProductMappingController.importCSV
);

router.get(
  '/stores/:id/mappings/export',
  authenticate,
  authorize(['ADMIN', 'COMPANY_OWNER', 'WAREHOUSE_MANAGER']),
  ProductMappingController.exportCSV
);

/**
 * Statistics route
 */
router.get(
  '/stores/:id/mappings/stats',
  authenticate,
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
  authorize(['ADMIN', 'COMPANY_OWNER', 'WAREHOUSE_MANAGER']),
  ProductMappingController.createMapping
);

/**
 * Individual mapping operations
 */
router.delete(
  '/mappings/:id',
  authenticate,
  authorize(['ADMIN', 'COMPANY_OWNER', 'WAREHOUSE_MANAGER']),
  ProductMappingController.deleteMapping
);

router.post(
  '/mappings/:id/toggle',
  authenticate,
  authorize(['ADMIN', 'COMPANY_OWNER', 'WAREHOUSE_MANAGER']),
  ProductMappingController.toggleStatus
);

router.post(
  '/mappings/:id/sync',
  authenticate,
  authorize(['ADMIN', 'COMPANY_OWNER', 'WAREHOUSE_MANAGER']),
  ProductMappingController.syncInventory
);

export default router;
