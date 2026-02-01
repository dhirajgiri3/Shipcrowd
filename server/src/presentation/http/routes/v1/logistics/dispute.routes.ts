/**
 * Dispute Routes
 *
 * Endpoints for dispute management and analytics.
 */

import { Router } from 'express';
import DisputeController from '@/presentation/http/controllers/logistics/dispute.controller';
import { authenticate } from '@/presentation/http/middleware/auth/auth';
import { requireAccess } from '@/presentation/http/middleware/auth/unified-access';
import { apiRateLimiter } from '@/shared/config/rateLimit.config';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// CUSTOMER ROUTES
// ============================================================================

/**
 * POST /disputes
 * Create new dispute
 * Rate limit: 10 requests/hour per user
 */
router.post(
    '/',
    authenticate,
    apiRateLimiter,
    DisputeController.createDispute
);

/**
 * GET /disputes
 * List all disputes (filtered by company for non-admin users)
 * Rate limit: 100 requests/hour per user
 */
router.get(
    '/',
    authenticate,
    apiRateLimiter,
    DisputeController.getDisputes
);

/**
 * GET /disputes/:id
 * Get single dispute details
 */
router.get(
    '/:id',
    authenticate,
    apiRateLimiter,
    DisputeController.getDisputeById
);

/**
 * POST /disputes/:id/evidence
 * Add evidence to dispute
 * Rate limit: 20 requests/hour per user
 */
router.post(
    '/:id/evidence',
    authenticate,
    apiRateLimiter,
    DisputeController.addEvidence
);

/**
 * GET /disputes/:id/timeline
 * Get dispute timeline
 */
router.get(
    '/:id/timeline',
    authenticate,
    apiRateLimiter,
    DisputeController.getTimeline
);

// ============================================================================
// ANALYTICS ROUTES (Customer + Admin)
// ============================================================================

/**
 * GET /disputes/stats
 * Get dispute statistics
 * Rate limit: 100 requests/hour per user
 */
router.get(
    '/analytics/stats',
    authenticate,
    apiRateLimiter,
    DisputeController.getStats
);

/**
 * GET /disputes/trends
 * Get dispute trends over time
 * Rate limit: 100 requests/hour per user
 */
router.get(
    '/analytics/trends',
    authenticate,
    apiRateLimiter,
    DisputeController.getTrends
);

/**
 * GET /disputes/top-reasons
 * Get top dispute reasons/categories
 */
router.get(
    '/analytics/top-reasons',
    authenticate,
    apiRateLimiter,
    DisputeController.getTopReasons
);

// ============================================================================
// ADMIN ROUTES
// ============================================================================

/**
 * PUT /admin/disputes/:id/status
 * Update dispute status
 * Requires: admin or super_admin role
 */
router.put(
    '/admin/:id/status',
    authenticate,
    requireAccess({ roles: ['admin'] }),
    apiRateLimiter,
    DisputeController.updateStatus
);

/**
 * POST /admin/disputes/:id/escalate
 * Escalate dispute
 * Requires: admin or super_admin role
 */
router.post(
    '/admin/:id/escalate',
    authenticate,
    requireAccess({ roles: ['admin'] }),
    apiRateLimiter,
    DisputeController.escalateDispute
);

/**
 * PUT /admin/disputes/:id/resolve
 * Resolve dispute
 * Requires: admin or super_admin role
 */
router.put(
    '/admin/:id/resolve',
    authenticate,
    requireAccess({ roles: ['admin'] }),
    apiRateLimiter,
    DisputeController.resolveDispute
);

/**
 * PUT /admin/disputes/:id/assign
 * Assign dispute to agent
 * Requires: admin or super_admin role
 */
router.put(
    '/admin/:id/assign',
    authenticate,
    requireAccess({ roles: ['admin'] }),
    apiRateLimiter,
    DisputeController.assignDispute
);

/**
 * DELETE /admin/disputes/:id
 * Soft delete dispute
 * Requires: super_admin role only
 */
router.delete(
    '/admin/:id',
    authenticate,
    requireAccess({ roles: ['admin'] }),
    apiRateLimiter,
    DisputeController.deleteDispute
);

/**
 * GET /admin/disputes/agent-performance
 * Get agent performance metrics
 * Requires: admin or super_admin role
 */
router.get(
    '/admin/analytics/agent-performance',
    authenticate,
    requireAccess({ roles: ['admin'] }),
    apiRateLimiter,
    DisputeController.getAgentPerformance
);

/**
 * GET /admin/disputes/sla-breaches
 * Get SLA breach summary
 * Requires: admin or super_admin role
 */
router.get(
    '/admin/analytics/sla-breaches',
    authenticate,
    requireAccess({ roles: ['admin'] }),
    apiRateLimiter,
    DisputeController.getSLABreaches
);

/**
 * POST /admin/disputes/:id/courier-query
 * Query courier about dispute
 * Requires: admin or super_admin role
 */
router.post(
    '/admin/:id/courier-query',
    authenticate,
    requireAccess({ roles: ['admin'] }),
    apiRateLimiter,
    DisputeController.queryCourier
);

// ============================================================================
// WEBHOOK ROUTES
// ============================================================================

/**
 * POST /webhooks/disputes/courier/:courierId
 * Webhook to receive courier responses
 * No authentication (validated by webhook signature)
 */
router.post(
    '/webhooks/courier/:courierId',
    DisputeController.courierWebhook
);

export default router;
