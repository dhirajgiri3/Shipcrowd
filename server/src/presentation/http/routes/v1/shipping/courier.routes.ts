import express from 'express';
import { AccessTier } from '../../../../../core/domain/types/access-tier';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import courierServiceController from '../../../controllers/shipping/courier-service.controller';
import { CourierController } from '../../../controllers/shipping/courier.controller';
import shipmentController from '../../../controllers/shipping/shipment.controller';
import { requireAccess } from '../../../middleware';
import { authenticate } from '../../../middleware/auth/auth';

const router = express.Router();
const courierController = new CourierController();

// Courier Management Routes
router.get(
    '/',
    authenticate,
    courierController.getCouriers
);

router.post(
    '/:provider/services/sync',
    authenticate,
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true }),
    asyncHandler(courierServiceController.syncProviderServices)
);

router.get(
    '/:id',
    authenticate,
    courierController.getCourier
);

router.put(
    '/:id',
    authenticate,
    courierController.updateCourier
);

router.post(
    '/:id/toggle-status',
    authenticate,
    courierController.toggleStatus
);

router.get(
    '/:id/performance',
    authenticate,
    courierController.getPerformance
);

// Backward-compatible alias for legacy clients still using POST
router.post(
    '/:id/performance',
    authenticate,
    courierController.getPerformance
);

/**
 * @route POST /api/v1/courier/recommendations
 * @desc Get AI-powered courier recommendations
 * @access Private
 */
router.post(
    '/recommendations',
    authenticate,
    asyncHandler(shipmentController.recommendCourier)
);

export default router;
