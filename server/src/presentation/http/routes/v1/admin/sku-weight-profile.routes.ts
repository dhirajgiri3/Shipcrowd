/**
 * Admin SKU Weight Profile Routes (Week 3)
 */

import express from 'express';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import * as skuWeightProfileController from '../../../controllers/admin/sku-weight-profile.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/auth/unified-access';

const router = express.Router();

// All routes require auth + platform admin access
router.use(authenticate);
router.use(requireAccess({ roles: ['admin', 'super_admin'] }));

router.get(
    '/',
    asyncHandler(skuWeightProfileController.listProfiles)
);

// Must be before /:sku so "bulk-learn" is not captured as sku
router.post(
    '/bulk-learn',
    asyncHandler(skuWeightProfileController.bulkLearn)
);

router.get(
    '/:sku',
    asyncHandler(skuWeightProfileController.getProfile)
);

router.post(
    '/:sku/freeze',
    asyncHandler(skuWeightProfileController.freezeWeight)
);

router.post(
    '/:sku/unfreeze',
    asyncHandler(skuWeightProfileController.unfreezeWeight)
);

export default router;
