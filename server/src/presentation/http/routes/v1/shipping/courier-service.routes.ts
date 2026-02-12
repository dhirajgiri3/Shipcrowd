import express from 'express';
import { authenticate } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware';
import { AccessTier } from '../../../../../core/domain/types/access-tier';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import courierServiceController from '../../../controllers/shipping/courier-service.controller';

const router = express.Router();

router.get(
    '/',
    authenticate,
    requireAccess({ tier: AccessTier.SANDBOX }),
    asyncHandler(courierServiceController.listCourierServices)
);

router.post(
    '/',
    authenticate,
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true }),
    asyncHandler(courierServiceController.createCourierService)
);

router.get(
    '/:id',
    authenticate,
    requireAccess({ tier: AccessTier.SANDBOX }),
    asyncHandler(courierServiceController.getCourierServiceById)
);

router.put(
    '/:id',
    authenticate,
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true }),
    asyncHandler(courierServiceController.updateCourierService)
);

router.post(
    '/:id/toggle-status',
    authenticate,
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true }),
    asyncHandler(courierServiceController.toggleCourierServiceStatus)
);

router.post(
    '/:provider/services/sync',
    authenticate,
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true }),
    asyncHandler(courierServiceController.syncProviderServices)
);

export default router;
