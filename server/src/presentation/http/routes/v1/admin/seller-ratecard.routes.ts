import express from 'express';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import sellerRateCardController from '../../../controllers/shipping/seller-ratecard.controller';
import { requireAccess } from '../../../middleware';
import { authenticate } from '../../../middleware/auth/auth';

const router = express.Router();

router.get(
    '/:sellerId/rate-cards',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'] }),
    asyncHandler(sellerRateCardController.listSellerRateCardsAdmin)
);

router.post(
    '/:sellerId/rate-cards',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'] }),
    asyncHandler(sellerRateCardController.createSellerRateCardAdmin)
);

router.put(
    '/:sellerId/rate-cards/:id',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'] }),
    asyncHandler(sellerRateCardController.updateSellerRateCardAdmin)
);

router.delete(
    '/:sellerId/rate-cards/:id',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'] }),
    asyncHandler(sellerRateCardController.deleteSellerRateCardAdmin)
);

export default router;
