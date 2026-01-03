import { Router } from 'express';
import FlipkartProductMappingController from '../../../controllers/integrations/flipkart-product-mapping.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { authorize } from '../../../middleware/auth/auth';

/**
 * Flipkart Product Mapping Routes
 *
 * All routes require authentication
 *
 * Base path: /api/v1/integrations/flipkart
 */

const router = Router();

/**
 * Auto-mapping route
 */
router.post(
  '/stores/:id/mappings/auto',
  authenticate,
  authorize(['ADMIN', 'COMPANY_OWNER', 'WAREHOUSE_MANAGER']),
  FlipkartProductMappingController.autoMapProducts
);

/**
 * CSV import/export routes
 */
router.post(
  '/stores/:id/mappings/import',
  authenticate,
  authorize(['ADMIN', 'COMPANY_OWNER', 'WAREHOUSE_MANAGER']),
  FlipkartProductMappingController.importCSV
);

router.get(
  '/stores/:id/mappings/export',
  authenticate,
  authorize(['ADMIN', 'COMPANY_OWNER', 'WAREHOUSE_MANAGER']),
  FlipkartProductMappingController.exportCSV
);

/**
 * Statistics route
 */
router.get(
  '/stores/:id/mappings/stats',
  authenticate,
  FlipkartProductMappingController.getStats
);

/**
 * List and create mappings
 */
router.get(
  '/stores/:id/mappings',
  authenticate,
  FlipkartProductMappingController.listMappings
);

router.post(
  '/stores/:id/mappings',
  authenticate,
  authorize(['ADMIN', 'COMPANY_OWNER', 'WAREHOUSE_MANAGER']),
  FlipkartProductMappingController.createMapping
);

/**
 * Individual mapping operations
 */
router.delete(
  '/mappings/:id',
  authenticate,
  authorize(['ADMIN', 'COMPANY_OWNER', 'WAREHOUSE_MANAGER']),
  FlipkartProductMappingController.deleteMapping
);

router.post(
  '/mappings/:id/toggle',
  authenticate,
  authorize(['ADMIN', 'COMPANY_OWNER', 'WAREHOUSE_MANAGER']),
  FlipkartProductMappingController.toggleStatus
);

router.post(
  '/mappings/:id/sync',
  authenticate,
  authorize(['ADMIN', 'COMPANY_OWNER', 'WAREHOUSE_MANAGER']),
  FlipkartProductMappingController.syncInventory
);

export default router;
