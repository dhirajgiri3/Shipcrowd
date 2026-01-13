import { Router } from 'express';
import VelocityIntegrationController from '../../../controllers/integrations/velocity-integration.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { apiRateLimiter } from '../../../middleware/system/rate-limiter.middleware';

const router = Router();

/**
 * Velocity Integration Routes
 * Direct API integration with Velocity Courier
 */

// Create shipment
router.post(
    '/shipments',
    authenticate,
    apiRateLimiter,
    VelocityIntegrationController.createShipment
);

// Track shipment
router.get(
    '/shipments/:awb/track',
    authenticate,
    VelocityIntegrationController.trackShipment
);

// Cancel shipment
router.post(
    '/shipments/:awb/cancel',
    authenticate,
    apiRateLimiter,
    VelocityIntegrationController.cancelShipment
);

// Calculate rate
router.post(
    '/rates/calculate',
    authenticate,
    VelocityIntegrationController.calculateRate
);

export default router;
