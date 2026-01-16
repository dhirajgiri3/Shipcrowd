/**
 * Fraud Detection Routes
 * 
 * Admin-only endpoints for fraud management.
 * All routes require authentication and admin role.
 */

import { Router } from 'express';
import FraudController from '@/presentation/http/controllers/fraud/fraud.controller';
// TODO: Uncomment when fraud detection is integrated
// import { authenticate } from '../../middleware/auth/authentication.middleware';
// import { authorize } from '../../middleware/auth/authorization.middleware';
// import { apiRateLimiter } from '../../middleware/system/rate-limiter.middleware';

const router = Router();

// TODO: Add middleware protection when fraud detection is integrated
// All fraud routes require authentication and admin role
// router.use(authenticate);
// router.use(authorize({ roles: ['admin'] }));

/**
 * GET /fraud/alerts
 * List fraud alerts with filtering
 */
router.get(
    '/alerts',
    // apiRateLimiter, // TODO: Add when integrated
    FraudController.getAlerts
);

/**
 * GET /fraud/alerts/:id
 * Get alert details
 */
router.get(
    '/alerts/:id',
    // apiRateLimiter, // TODO: Add when integrated
    FraudController.getAlertById
);

/**
 * PUT /fraud/alerts/:id/resolve
 * Resolve fraud alert
 */
router.put(
    '/alerts/:id/resolve',
    // apiRateLimiter, // TODO: Add when integrated
    FraudController.resolveAlert
);

/**
 * POST /fraud/blacklist
 * Add to blacklist
 */
router.post(
    '/blacklist',
    // apiRateLimiter, // TODO: Add when integrated
    FraudController.addToBlacklist
);

/**
 * GET /fraud/blacklist
 * List blacklist entries
 */
router.get(
    '/blacklist',
    // apiRateLimiter, // TODO: Add when integrated
    FraudController.getBlacklist
);

/**
 * DELETE /fraud/blacklist/:id
 * Remove from blacklist
 */
router.delete(
    '/blacklist/:id',
    // apiRateLimiter, // TODO: Add when integrated
    FraudController.removeFromBlacklist
);

/**
 * GET /fraud/stats
 * Get fraud statistics
 */
router.get(
    '/stats',
    // apiRateLimiter, // TODO: Add when integrated
    FraudController.getStats
);

export default router;
