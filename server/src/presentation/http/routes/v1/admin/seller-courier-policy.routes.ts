import express from 'express';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import sellerCourierPolicyController from '../../../controllers/shipping/seller-courier-policy.controller';
import { requireAccess } from '../../../middleware';
import { authenticate } from '../../../middleware/auth/auth';

const router = express.Router();

router.get(
    '/:sellerId/courier-policy',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'] }),
    asyncHandler(sellerCourierPolicyController.getSellerCourierPolicyAdmin)
);

router.put(
    '/:sellerId/courier-policy',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'] }),
    asyncHandler(sellerCourierPolicyController.upsertSellerCourierPolicyAdmin)
);

export default router;
