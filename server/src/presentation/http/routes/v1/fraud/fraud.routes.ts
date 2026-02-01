/**
 * Fraud Detection Routes
 * 
 * Admin-only endpoints for fraud management.
 * All routes require authentication and admin role.
 */

import { Router } from 'express';
import FraudController from '@/presentation/http/controllers/fraud/fraud.controller';
// FRAUD DETECTION ARCHIVED - DO NOT ENABLE UNTIL FUTURE RELEASE
// import { authenticate } from '@/presentation/http/middleware';
// import { requireAccess } from '@/presentation/http/middleware/auth/unified-access';
// // import { apiRateLimiter } from '../../middleware/system/rate-limiter.middleware';

const router = Router();

// // Rate limiting should be added here when available or imported
// // router.use(apiRateLimiter);

// // All fraud routes require authentication
// // router.use(authenticate);

// // All fraud routes require KYC verification
// // router.use(requireAccess({ kyc: true }));

// // Admin access required for all fraud operations
// // router.use(requireAccess({ roles: ['admin'] }));

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
