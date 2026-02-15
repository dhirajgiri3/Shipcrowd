import express from 'express';
import { AccessTier } from '../../../../../core/domain/types/access-tier';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import sellerCourierPolicyController from '../../../controllers/shipping/seller-courier-policy.controller';
import { requireAccess } from '../../../middleware';
import { authenticate } from '../../../middleware/auth/auth';

const router = express.Router();

router.get(
    '/:sellerId/courier-policy',
    authenticate,
    requireAccess({ tier: AccessTier.SANDBOX }),
    asyncHandler(sellerCourierPolicyController.getSellerCourierPolicy)
);

router.put(
    '/:sellerId/courier-policy',
    authenticate,
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true }),
    asyncHandler(sellerCourierPolicyController.upsertSellerCourierPolicy)
);

export default router;
