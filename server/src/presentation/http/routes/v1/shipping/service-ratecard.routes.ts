import express from 'express';
import { AccessTier } from '../../../../../core/domain/types/access-tier';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import serviceRateCardController from '../../../controllers/shipping/service-ratecard.controller';
import { requireAccess } from '../../../middleware';
import { authenticate } from '../../../middleware/auth/auth';

const router = express.Router();

router.get(
    '/',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'], tier: AccessTier.SANDBOX }),
    asyncHandler(serviceRateCardController.listServiceRateCards)
);

router.post(
    '/',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'], tier: AccessTier.PRODUCTION, kyc: true }),
    asyncHandler(serviceRateCardController.createServiceRateCard)
);

router.get(
    '/:id',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'], tier: AccessTier.SANDBOX }),
    asyncHandler(serviceRateCardController.getServiceRateCardById)
);

router.put(
    '/:id',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'], tier: AccessTier.PRODUCTION, kyc: true }),
    asyncHandler(serviceRateCardController.updateServiceRateCard)
);

router.post(
    '/:id/import',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'], tier: AccessTier.PRODUCTION, kyc: true }),
    asyncHandler(serviceRateCardController.importServiceRateCard)
);

router.post(
    '/:id/simulate',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'], tier: AccessTier.SANDBOX }),
    asyncHandler(serviceRateCardController.simulateServiceRateCard)
);

export default router;
