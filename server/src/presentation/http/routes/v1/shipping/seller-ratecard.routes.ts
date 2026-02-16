import express from 'express';
import { AccessTier } from '../../../../../core/domain/types/access-tier';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import sellerRateCardController from '../../../controllers/shipping/seller-ratecard.controller';
import { requireAccess } from '../../../middleware';
import { authenticate } from '../../../middleware/auth/auth';

const router = express.Router();

router.get(
    '/:sellerId/rate-cards',
    authenticate,
    requireAccess({ tier: AccessTier.SANDBOX }),
    asyncHandler(sellerRateCardController.listSellerRateCards)
);

export default router;
