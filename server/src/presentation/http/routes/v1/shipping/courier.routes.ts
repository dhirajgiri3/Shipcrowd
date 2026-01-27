import express from 'express';
import { authenticate } from '../../../middleware/auth/auth';
import ratecardController from '../../../controllers/shipping/ratecard.controller';
import asyncHandler from '../../../../../shared/utils/asyncHandler';

const router = express.Router();

/**
 * @route POST /api/v1/courier/recommendations
 * @desc Get AI-powered courier recommendations
 * @access Private
 */
router.post(
    '/recommendations',
    authenticate,
    asyncHandler(ratecardController.calculateSmartRates)
);

export default router;
