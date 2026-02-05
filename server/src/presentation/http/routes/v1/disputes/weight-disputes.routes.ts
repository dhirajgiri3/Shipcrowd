import express from 'express';
import { authenticate, csrfProtection } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/auth/access.middleware';
import { verifyWebhookSignature } from '../../../middleware/webhooks/webhook-signature.middleware';
import weightDisputesController from '../../../controllers/disputes/weight-disputes.controller';
import asyncHandler from '../../../../../shared/utils/asyncHandler';

const router = express.Router();

/**
 * @route GET /api/v1/disputes/weight
 * @desc Get all weight disputes with pagination and filters
 * @access Private
 * @query status - Filter by status (pending, under_review, resolved)
 * @query startDate - Filter by start date
 * @query endDate - Filter by end date
 * @query search - Search by dispute ID
 * @query page - Page number
 * @query limit - Items per page
 */
router.get('/', authenticate, asyncHandler(weightDisputesController.listDisputes));

/**
 * @route GET /api/v1/disputes/weight/metrics
 * @desc Get dispute metrics for company dashboard
 * @access Private
 * @query startDate - Optional start date for metrics
 * @query endDate - Optional end date for metrics
 */
router.get('/metrics', authenticate, asyncHandler(weightDisputesController.getMetrics));

/**
 * @route GET /api/v1/disputes/weight/analytics
 * @desc Get comprehensive dispute analytics (admin only)
 * @access Private (Admin)
 * @query startDate - Start date for analytics
 * @query endDate - End date for analytics
 * @query companyId - Filter by company (optional)
 * @query groupBy - Group trends by day/week/month
 */
router.get(
    '/analytics',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'] }),
    asyncHandler(weightDisputesController.getAnalytics)
);

/**
 * @route POST /api/v1/disputes/weight/batch
 * @desc Batch operations on multiple disputes (admin only)
 * @access Private (Admin)
 * @body disputeIds: string[], action: string, notes?: string
 */
router.post(
    '/batch',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'] }),
    csrfProtection,
    asyncHandler(weightDisputesController.batchOperation)
);

/**
 * @route POST /api/v1/disputes/weight/webhook
 * @desc Handle carrier weight discrepancy webhook
 * @access Public (Signature verified)
 */
router.post(
    '/webhook',
    (req, res, next) => verifyWebhookSignature('velocity')(req, res, next),
    asyncHandler(weightDisputesController.handleWebhook)
);

/**
 * @route GET /api/v1/disputes/weight/:disputeId
 * @desc Get dispute details by ID
 * @access Private
 */
router.get('/:disputeId', authenticate, asyncHandler(weightDisputesController.getDisputeDetails));

/**
 * @route POST /api/v1/disputes/weight/:disputeId/submit
 * @desc Submit seller evidence for dispute
 * @access Private
 * @body photos - Array of photo URLs
 * @body documents - Array of document URLs
 * @body notes - Seller notes/explanation
 */
router.post(
    '/:disputeId/submit',
    authenticate,
    csrfProtection,
    asyncHandler(weightDisputesController.submitSellerEvidence)
);

/**
 * @route POST /api/v1/disputes/weight/:disputeId/resolve
 * @desc Resolve dispute (admin only)
 * @access Private (Admin)
 * @body outcome - Resolution outcome (seller_favor, Shipcrowd_favor, split, waived)
 * @body adjustedWeight - Optional adjusted weight
 * @body refundAmount - Refund amount if seller_favor
 * @body deductionAmount - Deduction amount if Shipcrowd_favor
 * @body reasonCode - Reason code for resolution
 * @body notes - Resolution notes
 */
router.post(
    '/:disputeId/resolve',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'] }),
    csrfProtection,
    asyncHandler(weightDisputesController.resolveDispute)
);

export default router;
