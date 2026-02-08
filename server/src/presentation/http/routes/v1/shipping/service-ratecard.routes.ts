import express from 'express';
import { authenticate } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware';
import { AccessTier } from '../../../../../core/domain/types/access-tier';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import serviceRateCardController from '../../../controllers/shipping/service-ratecard.controller';
import { requireFeatureFlag } from '../../../middleware/system/feature-flag.middleware';

const router = express.Router();

router.get(
    '/',
    authenticate,
    requireFeatureFlag('enable_service_level_pricing'),
    requireAccess({ tier: AccessTier.SANDBOX }),
    asyncHandler(serviceRateCardController.listServiceRateCards)
);

router.post(
    '/',
    authenticate,
    requireFeatureFlag('enable_service_level_pricing'),
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true }),
    asyncHandler(serviceRateCardController.createServiceRateCard)
);

router.get(
    '/:id',
    authenticate,
    requireFeatureFlag('enable_service_level_pricing'),
    requireAccess({ tier: AccessTier.SANDBOX }),
    asyncHandler(serviceRateCardController.getServiceRateCardById)
);

router.put(
    '/:id',
    authenticate,
    requireFeatureFlag('enable_service_level_pricing'),
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true }),
    asyncHandler(serviceRateCardController.updateServiceRateCard)
);

router.post(
    '/:id/import',
    authenticate,
    requireFeatureFlag('enable_service_level_pricing'),
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true }),
    asyncHandler(serviceRateCardController.importServiceRateCard)
);

router.post(
    '/:id/simulate',
    authenticate,
    requireFeatureFlag('enable_service_level_pricing'),
    requireAccess({ tier: AccessTier.SANDBOX }),
    asyncHandler(serviceRateCardController.simulateServiceRateCard)
);

export default router;
