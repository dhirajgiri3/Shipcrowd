import { Router } from 'express';
import ManifestController from '../../../controllers/shipments/manifest.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { apiRateLimiter } from '../../../middleware/system/rate-limiter.middleware';

const router = Router();

/**
 * Manifest Routes
 * All routes require authentication
 */

// Create manifest
router.post(
    '/manifest',
    authenticate,
    apiRateLimiter,
    ManifestController.createManifest
);

// List manifests
router.get(
    '/manifests',
    authenticate,
    ManifestController.listManifests
);

// Get manifest details
router.get(
    '/manifests/:id',
    authenticate,
    ManifestController.getManifest
);

// Download manifest PDF
router.get(
    '/manifests/:id/download',
    authenticate,
    ManifestController.downloadManifest
);

// Close manifest and schedule pickup
router.post(
    '/manifests/:id/close',
    authenticate,
    apiRateLimiter,
    ManifestController.closeManifest
);

// Mark as handed over
router.post(
    '/manifests/:id/handover',
    authenticate,
    apiRateLimiter,
    ManifestController.handoverManifest
);

export default router;
