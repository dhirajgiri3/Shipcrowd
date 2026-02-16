import express from 'express';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import weightDisputesController from '../../../controllers/disputes/weight-disputes.controller';
import { authenticate, csrfProtection } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/index';

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

/**
 * @route GET /api/v1/admin/disputes/weight
 * @desc List weight disputes (platform-wide or company-scoped via query.companyId)
 * @access Admin / Super Admin only
 */
router.get(
    '/',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'] }),
    asyncHandler(weightDisputesController.listDisputes)
);

/**
 * @route GET /api/v1/admin/disputes/weight/analytics
 * @desc Get dispute analytics
 * @access Admin / Super Admin only
 */
router.get(
    '/analytics',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'] }),
    asyncHandler(weightDisputesController.getAnalytics)
);

/**
 * @route POST /api/v1/admin/disputes/weight/batch
 * @desc Batch dispute actions
 * @access Admin / Super Admin only
 */
router.post(
    '/batch',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'] }),
    csrfProtection,
    asyncHandler(weightDisputesController.batchOperation)
);

/**
 * @route GET /api/v1/admin/disputes/weight/:disputeId
 * @desc Get dispute details
 * @access Admin / Super Admin only
 */
router.get(
    '/:disputeId',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'] }),
    asyncHandler(weightDisputesController.getDisputeDetails)
);

/**
 * @route POST /api/v1/admin/disputes/weight/:disputeId/resolve
 * @desc Resolve dispute
 * @access Admin / Super Admin only
 */
router.post(
    '/:disputeId/resolve',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'] }),
    csrfProtection,
    asyncHandler(weightDisputesController.resolveDispute)
);

export default router;
