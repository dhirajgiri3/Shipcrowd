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
    requireAccess({ roles: ['admin', 'super_admin'], tier: AccessTier.SANDBOX }),
    courierController.getCouriers
);

router.post(
    '/:provider/services/sync',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'], tier: AccessTier.PRODUCTION, kyc: true }),
    asyncHandler(courierServiceController.syncProviderServices)
);

router.get(
    '/:id',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'], tier: AccessTier.SANDBOX }),
    courierController.getCourier
);

router.put(
    '/:id',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'], tier: AccessTier.PRODUCTION, kyc: true }),
    courierController.updateCourier
);

router.post(
    '/:id/toggle-status',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'], tier: AccessTier.PRODUCTION, kyc: true }),
    courierController.toggleStatus
);

router.get(
    '/:id/performance',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'], tier: AccessTier.SANDBOX }),
    courierController.getPerformance
);

// Backward-compatible alias for legacy clients still using POST
router.post(
    '/:id/performance',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'], tier: AccessTier.SANDBOX }),
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
