import { Router } from 'express';
import AmazonProductMappingController from '../../../controllers/integrations/amazon-product-mapping.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { authorize } from '../../../middleware/auth/auth';

/**
 * Amazon Product Mapping Routes
 *
 * All routes require authentication
 *
 * Base path: /api/v1/integrations/amazon/stores/:storeId/mappings
 */

const router = Router({ mergeParams: true }); // Enable access to :storeId from parent router

/**
 * Mapping Operations
 */

// Auto-map products by SKU match
router.post(
    '/auto-map',
    authenticate,
    authorize(['ADMIN', 'COMPANY_OWNER']),
    AmazonProductMappingController.autoMap
);

// List mappings with filters
router.get(
    '/',
    authenticate,
    AmazonProductMappingController.listMappings
);

// Create manual mapping
router.post(
    '/',
    authenticate,
    authorize(['ADMIN', 'COMPANY_OWNER']),
    AmazonProductMappingController.createMapping
);

// Delete mapping
router.delete(
    '/:id',
    authenticate,
    authorize(['ADMIN', 'COMPANY_OWNER']),
    AmazonProductMappingController.deleteMapping
);

/**
 * CSV Import/Export
 */

// Import mappings from CSV
router.post(
    '/import',
    authenticate,
    authorize(['ADMIN', 'COMPANY_OWNER']),
    AmazonProductMappingController.importCSV
);

// Export mappings to CSV
router.get(
    '/export',
    authenticate,
    AmazonProductMappingController.exportCSV
);

/**
 * Statistics
 */

// Get mapping statistics
router.get(
    '/stats',
    authenticate,
    AmazonProductMappingController.getStats
);

export default router;
