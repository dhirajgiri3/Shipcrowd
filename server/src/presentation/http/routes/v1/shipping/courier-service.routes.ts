import express from 'express';
import { AccessTier } from '../../../../../core/domain/types/access-tier';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import courierServiceController from '../../../controllers/shipping/courier-service.controller';
import { requireAccess } from '../../../middleware';
import { authenticate } from '../../../middleware/auth/auth';

const router = express.Router();

router.get(
    '/',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'], tier: AccessTier.SANDBOX }),
    asyncHandler(courierServiceController.listCourierServices)
);

router.post(
    '/',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'], tier: AccessTier.PRODUCTION, kyc: true }),
    asyncHandler(courierServiceController.createCourierService)
);

router.get(
    '/:id',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'], tier: AccessTier.SANDBOX }),
    asyncHandler(courierServiceController.getCourierServiceById)
);

router.put(
    '/:id',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'], tier: AccessTier.PRODUCTION, kyc: true }),
    asyncHandler(courierServiceController.updateCourierService)
);

router.delete(
    '/:id',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'], tier: AccessTier.PRODUCTION, kyc: true }),
    asyncHandler(courierServiceController.deleteCourierService)
);

router.post(
    '/:id/toggle-status',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'], tier: AccessTier.PRODUCTION, kyc: true }),
    asyncHandler(courierServiceController.toggleCourierServiceStatus)
);

router.post(
    '/:provider/services/sync',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'], tier: AccessTier.PRODUCTION, kyc: true }),
    asyncHandler(courierServiceController.syncProviderServices)
);

export default router;
