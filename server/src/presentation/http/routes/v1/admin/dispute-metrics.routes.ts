import express from 'express';
import { authenticate } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/auth/access.middleware';
import weightDisputesController from '../../../controllers/disputes/weight-disputes.controller';
import asyncHandler from '../../../../../shared/utils/asyncHandler';

const router = express.Router();

/**
 * @route GET /api/v1/admin/disputes/weight/metrics
 * @desc Get platform-wide weight dispute metrics (pending, underReview, total)
 * @access Admin / Super Admin only
 */
router.get(
    '/metrics',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'] }),
    asyncHandler(weightDisputesController.getAdminPlatformMetrics)
);

export default router;
