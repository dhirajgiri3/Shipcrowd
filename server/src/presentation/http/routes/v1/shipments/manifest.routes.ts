import { Router } from 'express';
import ManifestController from '../../../controllers/shipments/manifest.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { apiRateLimiter } from '../../../../../shared/config/rateLimit.config';

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

// Update manifest (pickup details, notes)
router.patch(
    '/manifests/:id',
    authenticate,
    apiRateLimiter,
    ManifestController.updateManifest
);

// Delete manifest (only if status is 'open')
router.delete(
    '/manifests/:id',
    authenticate,
    apiRateLimiter,
    ManifestController.deleteManifest
);

// Add shipments to manifest
router.post(
    '/manifests/:id/add-shipments',
    authenticate,
    apiRateLimiter,
    ManifestController.addShipments
);

// Remove shipments from manifest
router.post(
    '/manifests/:id/remove-shipments',
    authenticate,
    apiRateLimiter,
    ManifestController.removeShipments
);

export default router;
