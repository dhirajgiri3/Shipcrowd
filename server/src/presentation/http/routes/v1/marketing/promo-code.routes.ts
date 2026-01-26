import { Router } from 'express';
import PromoCodeController from '../../../controllers/marketing/promo-code.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { apiRateLimiter } from '../../../middleware/system/rate-limiter.middleware';

const router = Router();

/**
 * Promo Code Routes
 * Authentication required for all routes
 */

// Create promo code
router.post(
    '/',
    authenticate,
    apiRateLimiter,
    PromoCodeController.createPromo
);

// Validate promo code
router.post(
    '/validate',
    authenticate,
    apiRateLimiter,
    PromoCodeController.validatePromo
);

// List promo codes
router.get(
    '/',
    authenticate,
    PromoCodeController.listPromos
);

// Update promo code
router.patch(
    '/:id',
    authenticate,
    apiRateLimiter,
    PromoCodeController.updatePromo
);

// Delete promo code
router.delete(
    '/:id',
    authenticate,
    apiRateLimiter,
    PromoCodeController.deletePromo
);

export default router;
