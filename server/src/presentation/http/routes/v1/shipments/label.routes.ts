import { Router } from 'express';
import LabelController from '../../../controllers/shipments/label.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { apiRateLimiter } from '../../../../../shared/config/rateLimit.config';

const router = Router();

/**
 * Label Routes
 * All routes require authentication
 */

// Generate label (PDF or ZPL)
router.post(
    '/:id/label',
    authenticate,
    apiRateLimiter,
    LabelController.generateLabel
);

// Download label
router.get(
    '/:id/label/download',
    authenticate,
    LabelController.downloadLabel
);

// Bulk label generation
router.post(
    '/bulk-labels',
    authenticate,
    apiRateLimiter,
    LabelController.generateBulkLabels
);

// Reprint label
router.post(
    '/:id/label/reprint',
    authenticate,
    apiRateLimiter,
    LabelController.reprintLabel
);

// Get supported formats
router.get(
    '/:id/label/formats',
    authenticate,
    LabelController.getSupportedFormats
);

export default router;
