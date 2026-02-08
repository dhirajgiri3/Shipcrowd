import express from 'express';
import { authenticate } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware';
import { AccessTier } from '../../../../../core/domain/types/access-tier';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import courierServiceController from '../../../controllers/shipping/courier-service.controller';
import { requireFeatureFlag } from '../../../middleware/system/feature-flag.middleware';

const router = express.Router();

router.get(
    '/',
    authenticate,
    requireFeatureFlag('enable_service_level_pricing'),
    requireAccess({ tier: AccessTier.SANDBOX }),
    asyncHandler(courierServiceController.listCourierServices)
);

router.post(
    '/',
    authenticate,
    requireFeatureFlag('enable_service_level_pricing'),
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true }),
    asyncHandler(courierServiceController.createCourierService)
);

router.get(
    '/:id',
    authenticate,
    requireFeatureFlag('enable_service_level_pricing'),
    requireAccess({ tier: AccessTier.SANDBOX }),
    asyncHandler(courierServiceController.getCourierServiceById)
);

router.put(
    '/:id',
    authenticate,
    requireFeatureFlag('enable_service_level_pricing'),
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true }),
    asyncHandler(courierServiceController.updateCourierService)
);

router.post(
    '/:id/toggle-status',
    authenticate,
    requireFeatureFlag('enable_service_level_pricing'),
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true }),
    asyncHandler(courierServiceController.toggleCourierServiceStatus)
);

export default router;
