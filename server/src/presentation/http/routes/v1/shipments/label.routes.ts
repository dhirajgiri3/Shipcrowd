import { Router } from 'express';
import { apiRateLimiter } from '../../../../../shared/config/rateLimit.config';
import LabelController from '../../../controllers/shipments/label.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/auth/unified-access';

const router = Router();

/**
 * Label Routes
 * All routes require authentication
 */

// Generate label (PDF or ZPL)
router.post(
    '/:id/label',
    authenticate,
    requireAccess({ kyc: true }),
    apiRateLimiter,
    LabelController.generateLabel
);

// Download label
// Product decision: read-only download remains auth-only (no KYC gate).
router.get(
    '/:id/label/download',
    authenticate,
    LabelController.downloadLabel
);

// Bulk label generation
router.post(
    '/bulk-labels',
    authenticate,
    requireAccess({ kyc: true }),
    apiRateLimiter,
    LabelController.generateBulkLabels
);

// Reprint label
router.post(
    '/:id/label/reprint',
    authenticate,
    requireAccess({ kyc: true }),
    apiRateLimiter,
    LabelController.reprintLabel
);

// Get supported formats
// Product decision: read-only metadata remains auth-only (no KYC gate).
router.get(
    '/:id/label/formats',
    authenticate,
    LabelController.getSupportedFormats
);

export default router;
