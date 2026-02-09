/**
 * Admin Return Routes
 * 
 * Admin-specific endpoints for managing returns across all companies.
 */

import { Router } from 'express';
import AdminReturnController from '../../../controllers/logistics/admin-return.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/auth/unified-access';
import { apiRateLimiter } from '../../../../../shared/config/rateLimit.config';

const router = Router();

// All routes require authentication and admin access
router.use(authenticate);
router.use(requireAccess({ roles: ['admin'] }));

/**
 * GET /api/v1/admin/returns
 * List all returns with pagination and filters (Admin can see ALL companies)
 * 
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20)
 * - status: string (filter by status)
 * - returnReason: string (filter by reason)
 * - companyId: string (filter by company)
 * - search: string (search by returnId or orderId)
 */
router.get(
    '/',
    AdminReturnController.getAllReturns
);

/**
 * GET /api/v1/admin/returns/stats
 * Get return analytics and statistics for admin dashboard
 * 
 * Query params:
 * - companyId: string (optional filter)
 */
router.get(
    '/stats',
    AdminReturnController.getReturnStats
);

/**
 * GET /api/v1/admin/returns/:returnId
 * Get detailed return information (Admin can view ANY return)
 */
router.get(
    '/:returnId',
    AdminReturnController.getReturnById
);

/**
 * PATCH /api/v1/admin/returns/:returnId/status
 * Update return status (Admin override)
 * 
 * Body:
 * - status: string (required)
 * - notes: string (optional)
 */
router.patch(
    '/:returnId/status',
    apiRateLimiter,
    AdminReturnController.updateReturnStatus
);

/**
 * POST /api/v1/admin/returns/:returnId/refund
 * Manually trigger refund processing
 * 
 * Access: Admin only
 */
router.post(
    '/:returnId/refund',
    apiRateLimiter,
    AdminReturnController.processReturnRefund
);

export default router;
