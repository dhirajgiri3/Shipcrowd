/**
 * Dispute Routes
 *
 * Defines all HTTP routes for dispute resolution system:
 * - Customer routes: Create disputes, add evidence, view status
 * - Admin routes: Manage disputes, assign agents, resolve, analytics
 * - Webhook routes: Courier integrations
 *
 * SECURITY:
 * ========
 * - All customer routes require authentication
 * - Admin routes require admin/super_admin role
 * - Rate limiting applied to prevent abuse
 * - File upload size limits enforced
 *
 * RATE LIMITS:
 * ===========
 * - Create dispute: 10/hour per user
 * - Add evidence: 20/hour per user
 * - List disputes: 100/hour per user
 * - Analytics: 100/hour per user
 */

import { Router } from 'express';
import DisputeController from '@/presentation/http/controllers/logistics/dispute.controller';
import { authenticate } from '@/presentation/http/middleware/auth/authentication.middleware';
import { authorize } from '@/presentation/http/middleware/auth/authorization.middleware';
import { apiRateLimiter } from '@/presentation/http/middleware/system/rate-limiter.middleware';
import { validateRequest } from '@/presentation/http/middleware/validation/validate-request.middleware';
import {
    createDisputeSchema,
    addEvidenceSchema,
    updateStatusSchema,
    resolveDisputeSchema,
    assignDisputeSchema,
    queryParamsSchema,
} from '@/shared/validation/dispute.schemas';

const router = Router();

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
    validateRequest(createDisputeSchema),
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
    validateRequest(queryParamsSchema, 'query'),
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
    validateRequest(addEvidenceSchema),
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
    authorize({ roles: ['admin', 'super_admin'] }),
    apiRateLimiter,
    validateRequest(updateStatusSchema),
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
    authorize({ roles: ['admin', 'super_admin'] }),
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
    authorize({ roles: ['admin', 'super_admin'] }),
    apiRateLimiter,
    validateRequest(resolveDisputeSchema),
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
    authorize({ roles: ['admin', 'super_admin'] }),
    apiRateLimiter,
    validateRequest(assignDisputeSchema),
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
    authorize({ roles: ['super_admin'] }),
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
    authorize({ roles: ['admin', 'super_admin'] }),
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
    authorize({ roles: ['admin', 'super_admin'] }),
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
    authorize({ roles: ['admin', 'super_admin'] }),
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
