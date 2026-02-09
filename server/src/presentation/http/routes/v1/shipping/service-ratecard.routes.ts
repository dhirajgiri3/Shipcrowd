import express from 'express';
import { authenticate } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware';
import { AccessTier } from '../../../../../core/domain/types/access-tier';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import serviceRateCardController from '../../../controllers/shipping/service-ratecard.controller';

const router = express.Router();

router.get(
    '/',
    authenticate,
    requireAccess({ tier: AccessTier.SANDBOX }),
    asyncHandler(serviceRateCardController.listServiceRateCards)
);

router.post(
    '/',
    authenticate,
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true }),
    asyncHandler(serviceRateCardController.createServiceRateCard)
);

router.get(
    '/:id',
    authenticate,
    requireAccess({ tier: AccessTier.SANDBOX }),
    asyncHandler(serviceRateCardController.getServiceRateCardById)
);

router.put(
    '/:id',
    authenticate,
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true }),
    asyncHandler(serviceRateCardController.updateServiceRateCard)
);

router.post(
    '/:id/import',
    authenticate,
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true }),
    asyncHandler(serviceRateCardController.importServiceRateCard)
);

router.post(
    '/:id/simulate',
    authenticate,
    requireAccess({ tier: AccessTier.SANDBOX }),
    asyncHandler(serviceRateCardController.simulateServiceRateCard)
);

export default router;
