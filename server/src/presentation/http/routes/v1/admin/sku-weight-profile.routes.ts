/**
 * Admin SKU Weight Profile Routes (Week 3)
 */

import express from 'express';
import { authenticate } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/auth/access.middleware';
import * as skuWeightProfileController from '../../../controllers/admin/sku-weight-profile.controller';
import asyncHandler from '../../../../../shared/utils/asyncHandler';

const router = express.Router();

// All routes require auth; admin routes require admin role
router.get(
    '/',
    authenticate,
    asyncHandler(skuWeightProfileController.listProfiles)
);

// Must be before /:sku so "bulk-learn" is not captured as sku
router.post(
    '/bulk-learn',
    authenticate,
    asyncHandler(skuWeightProfileController.bulkLearn)
);

router.get(
    '/:sku',
    authenticate,
    asyncHandler(skuWeightProfileController.getProfile)
);

router.post(
    '/:sku/freeze',
    authenticate,
    asyncHandler(skuWeightProfileController.freezeWeight)
);

router.post(
    '/:sku/unfreeze',
    authenticate,
    asyncHandler(skuWeightProfileController.unfreezeWeight)
);

export default router;
