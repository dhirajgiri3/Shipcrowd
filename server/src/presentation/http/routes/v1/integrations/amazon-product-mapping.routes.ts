import { Router } from 'express';
import AmazonProductMappingController from '../../../controllers/integrations/amazon-product-mapping.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/auth/unified-access';

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
    requireAccess({ roles: ['admin'], teamRoles: ['owner'], kyc: true }),
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
    requireAccess({ roles: ['admin'], teamRoles: ['owner'], kyc: true }),
    AmazonProductMappingController.createMapping
);

// Delete mapping
router.delete(
    '/:id',
    authenticate,
    requireAccess({ roles: ['admin'], teamRoles: ['owner'], kyc: true }),
    AmazonProductMappingController.deleteMapping
);

/**
 * CSV Import/Export
 */

// Import mappings from CSV
router.post(
    '/import',
    authenticate,
    requireAccess({ roles: ['admin'], teamRoles: ['owner'], kyc: true }),
    AmazonProductMappingController.importCSV
);

// Export mappings to CSV
router.get(
    '/export',
    authenticate,
    requireAccess({ roles: ['admin'], teamRoles: ['owner'], kyc: true }),
    AmazonProductMappingController.exportCSV
);

/**
 * Statistics
 */

// Get mapping statistics
router.get(
    '/stats',
    authenticate,
    requireAccess({ kyc: true }),
    AmazonProductMappingController.getStats
);

export default router;
