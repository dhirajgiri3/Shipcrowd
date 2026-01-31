import express from 'express';
import { authenticate, csrfProtection } from '../../../middleware/auth/auth';
import { requireAccess, requireCompleteCompany } from '../../../middleware/index';
import { AccessTier } from '../../../../../core/domain/types/access-tier';
import shipmentController from '../../../controllers/shipping/shipment.controller';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import labelRoutes from '../shipments/label.routes';
import manifestRoutes from '../shipments/manifest.routes';
import bulkRoutes from '../shipments/bulk.routes';

const router = express.Router();

// Mount label routes
router.use(labelRoutes);

// Mount manifest routes
router.use(manifestRoutes);

// Mount bulk routes
router.use('/bulk', bulkRoutes);

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
 * @route GET /api/v1/shipments/tracking/:trackingNumber
 * @desc Track a shipment by AWB/tracking number
 * @access Private (Sandbox+)
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
 */
import { publicTrackingRateLimiter } from '../../../../../shared/config/rateLimit.config';

/**
 * @route GET /api/v1/shipments/public/track/:trackingNumber
 * @desc Track a shipment by AWB/tracking number (Public)
 * @access Public
 * @rateLimit 60 requests per minute
 */
router.get('/public/track/:trackingNumber', publicTrackingRateLimiter, asyncHandler(shipmentController.trackShipmentPublic));

/**
 * @route GET /api/v1/shipments/:shipmentId
 * @desc Get a single shipment by ID
 * @access Private (Sandbox+)
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
