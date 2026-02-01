import express from 'express';
import { authenticate } from '../../../middleware/auth/auth';
import sellerHealthController from '../../../controllers/system/seller-health.controller';
import asyncHandler from '../../../../../shared/utils/asyncHandler';

const router = express.Router();

/**
 * @route GET /api/v1/admin/seller-health
 * @desc Get seller health metrics
 * @access Private
 */
router.get('/', authenticate, asyncHandler(sellerHealthController.getSellerHealth));

export default router;
