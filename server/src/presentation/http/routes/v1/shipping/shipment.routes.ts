import express from 'express';
import { authenticate, csrfProtection } from '../../../middleware/auth/auth';
import { requireAccess, requireCompleteCompany } from '../../../middleware/index';
import { AccessTier } from '../../../../../core/domain/types/access-tier';
import shipmentController from '../../../controllers/shipping/shipment.controller';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import labelRoutes from '../shipments/label.routes';
import manifestRoutes from '../shipments/manifest.routes';
import bulkRoutes from '../shipments/bulk.routes';
import podRoutes from '../shipments/pod.routes';
import { requireFeatureFlag } from '../../../middleware/system/feature-flag.middleware';

const router = express.Router();

// Mount label routes
router.use(labelRoutes);

// Mount manifest routes
router.use(manifestRoutes);

// Mount bulk routes
router.use('/bulk', bulkRoutes);

// Mount POD routes
router.use(podRoutes);

/**
 * @route POST /api/v1/shipments
 * @desc Create a new shipment from an order
 * @access Private (Production, Complete Profile)
 */
router.post(
    '/',
    authenticate,
    csrfProtection,
    requireCompleteCompany,
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true }),
    asyncHandler(shipmentController.createShipment)
);

/**
 * @route POST /api/v1/shipments/book-from-quote
 * @desc Create shipment using a locked quote session option
 * @access Private (Production, Complete Profile)
 */
router.post(
    '/book-from-quote',
    authenticate,
    csrfProtection,
    requireFeatureFlag('enable_service_level_pricing'),
    requireCompleteCompany,
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true }),
    asyncHandler(shipmentController.bookFromQuote)
);

/**
 * @route GET /api/v1/shipments/stats
 * @desc Get shipment statistics
 * @access Private (Sandbox+)
 * @note Must be defined before /:shipmentId route to prevent "stats" being treated as an ID
 */
router.get(
    '/stats',
    authenticate,
    requireAccess({ tier: AccessTier.SANDBOX }),
    asyncHandler(shipmentController.getShipmentStats)
);

/**
 * @route GET /api/v1/shipments/tracking/:trackingNumber
 * @desc Track a shipment by AWB/tracking number
 * @access Private (Sandbox+)
 * @note Must be defined before /:shipmentId route to prevent conflicts
 */
router.get(
    '/tracking/:trackingNumber',
    authenticate,
    requireAccess({ tier: AccessTier.SANDBOX }),
    asyncHandler(shipmentController.trackShipment)
);

/**
 * @route GET /api/v1/shipments/public/track/:trackingNumber
 * @desc Track a shipment by AWB/tracking number (Public)
 * @access Public
 * @rateLimit 60 requests per minute
 */
import { publicTrackingRateLimiter } from '../../../../../shared/config/rateLimit.config';
router.get('/public/track/:trackingNumber', publicTrackingRateLimiter, asyncHandler(shipmentController.trackShipmentPublic));

/**
 * @route GET /api/v1/shipments
 * @desc Get all shipments with pagination and filters
 * @access Private (Sandbox+)
 */
router.get(
    '/',
    authenticate,
    requireAccess({ tier: AccessTier.SANDBOX }),
    asyncHandler(shipmentController.getShipments)
);

/**
 * @route GET /api/v1/shipments/:shipmentId
 * @desc Get a single shipment by ID
 * @access Private (Sandbox+)
 * @note Must be defined AFTER all specific routes (stats, tracking, etc.)
 */
router.get(
    '/:shipmentId',
    authenticate,
    requireAccess({ tier: AccessTier.SANDBOX }),
    asyncHandler(shipmentController.getShipmentById)
);

/**
 * @route PATCH /api/v1/shipments/:shipmentId/status
 * @desc Update shipment status
 * @access Private (Production)
 */
router.patch(
    '/:shipmentId/status',
    authenticate,
    csrfProtection,
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true }),
    asyncHandler(shipmentController.updateShipmentStatus)
);

/**
 * @route DELETE /api/v1/shipments/:shipmentId
 * @desc Soft delete a shipment
 * @access Private (Production)
 */
router.delete(
    '/:shipmentId',
    authenticate,
    csrfProtection,
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true }),
    asyncHandler(shipmentController.deleteShipment)
);

export default router;
