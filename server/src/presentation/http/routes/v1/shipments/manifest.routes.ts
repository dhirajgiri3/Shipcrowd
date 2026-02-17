import { Router } from 'express';
import { apiRateLimiter } from '../../../../../shared/config/rateLimit.config';
import ManifestController from '../../../controllers/shipments/manifest.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/auth/unified-access';

const router = Router();

/**
 * Manifest Routes
 * All routes require authentication
 */

// Create manifest
router.post(
    '/manifest',
    authenticate,
    requireAccess({ kyc: true }),
    apiRateLimiter,
    ManifestController.createManifest
);

// List manifests
router.get(
    '/manifests',
    authenticate,
    ManifestController.listManifests
);

// Manifest stats
router.get(
    '/manifests/stats',
    authenticate,
    ManifestController.getManifestStats
);

// Eligible shipments for manifest
router.get(
    '/manifests/eligible-shipments',
    authenticate,
    ManifestController.listEligibleShipments
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
    requireAccess({ kyc: true }),
    apiRateLimiter,
    ManifestController.closeManifest
);

// Mark as handed over
router.post(
    '/manifests/:id/handover',
    authenticate,
    requireAccess({ kyc: true }),
    apiRateLimiter,
    ManifestController.handoverManifest
);

// Update manifest (pickup details, notes)
router.patch(
    '/manifests/:id',
    authenticate,
    requireAccess({ kyc: true }),
    apiRateLimiter,
    ManifestController.updateManifest
);

// Delete manifest (only if status is 'open')
router.delete(
    '/manifests/:id',
    authenticate,
    requireAccess({ kyc: true }),
    apiRateLimiter,
    ManifestController.deleteManifest
);

// Add shipments to manifest
router.post(
    '/manifests/:id/add-shipments',
    authenticate,
    requireAccess({ kyc: true }),
    apiRateLimiter,
    ManifestController.addShipments
);

// Remove shipments from manifest
router.post(
    '/manifests/:id/remove-shipments',
    authenticate,
    requireAccess({ kyc: true }),
    apiRateLimiter,
    ManifestController.removeShipments
);

export default router;
