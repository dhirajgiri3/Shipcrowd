import express from 'express';
import { authenticate } from '../../../middleware/auth/auth';
import ratecardController from '../../../controllers/shipping/ratecard.controller';
import { CourierController } from '../../../controllers/shipping/courier.controller';
import asyncHandler from '../../../../../shared/utils/asyncHandler';

const router = express.Router();
const courierController = new CourierController();

// Courier Management Routes
router.get(
    '/',
    authenticate,
    courierController.getCouriers
);

router.get(
    '/:id',
    authenticate,
    courierController.getCourier
);

router.put(
    '/:id',
    authenticate,
    courierController.updateCourier
);

router.post(
    '/:id/toggle-status',
    authenticate,
    courierController.toggleStatus
);

router.post(
    '/:id/test-connection',
    authenticate,
    courierController.testConnection
);

router.get(
    '/:id/performance',
    authenticate,
    courierController.getPerformance
);

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
