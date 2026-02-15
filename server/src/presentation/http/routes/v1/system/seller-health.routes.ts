import express from 'express';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import sellerHealthController from '../../../controllers/system/seller-health.controller';
import { authenticate } from '../../../middleware/auth/auth';

const router = express.Router();

/**
 * @route GET /api/v1/admin/seller-health
 * @desc Get seller health metrics
 * @access Private
 */
router.get('/export', authenticate, asyncHandler(sellerHealthController.exportSellers));
router.get('/', authenticate, asyncHandler(sellerHealthController.getSellerHealth));

export default router;
