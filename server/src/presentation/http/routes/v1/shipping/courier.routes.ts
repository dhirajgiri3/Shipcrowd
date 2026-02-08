import express from 'express';
import { authenticate } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware';
import { AccessTier } from '../../../../../core/domain/types/access-tier';
import ratecardController from '../../../controllers/shipping/ratecard.controller';
import { CourierController } from '../../../controllers/shipping/courier.controller';
import courierServiceController from '../../../controllers/shipping/courier-service.controller';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import { requireFeatureFlag } from '../../../middleware/system/feature-flag.middleware';

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
    requireFeatureFlag('enable_service_level_pricing'),
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

router.post(
    '/:id/test-connection',
    authenticate,
    courierController.testConnection
);

router.get(
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
    asyncHandler(ratecardController.calculateSmartRates)
);

export default router;
