import express from 'express';
import { authenticate } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware';
import { AccessTier } from '../../../../../core/domain/types/access-tier';
import quoteController from '../../../controllers/shipping/quote.controller';
import asyncHandler from '../../../../../shared/utils/asyncHandler';

const router = express.Router();

/**
 * @route POST /api/v1/quotes/courier-options
 * @desc Generate courier quote options for seller
 * @access Private (Sandbox+)
 */
router.post(
    '/courier-options',
    authenticate,
    requireAccess({ tier: AccessTier.SANDBOX }),
    asyncHandler(quoteController.getCourierOptions)
);

/**
 * @route POST /api/v1/quotes/:sessionId/select
 * @desc Select quote option in existing quote session
 * @access Private (Sandbox+)
 */
router.post(
    '/:sessionId/select',
    authenticate,
    requireAccess({ tier: AccessTier.SANDBOX }),
    asyncHandler(quoteController.selectCourierOption)
);

export default router;
