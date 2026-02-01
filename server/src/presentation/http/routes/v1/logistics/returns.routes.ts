/**
 * Return Routes
 * 
 * Endpoints for returns management.
 */

import { Router } from 'express';
import ReturnController from '@/presentation/http/controllers/logistics/return.controller';
import { authenticate } from '@/presentation/http/middleware/auth/auth';
import { requireAccess } from '@/presentation/http/middleware/auth/unified-access';
import { apiRateLimiter } from '@/shared/config/rateLimit.config';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/returns
 * Create a new return request
 * 
 * Access: Customer, Seller
 * Rate Limit: 5 requests per minute
 */
router.post(
    '/',
    apiRateLimiter,
    ReturnController.createReturnRequest
);

/**
 * GET /api/v1/returns
 * List all returns with pagination and filters
 * 
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20)
 * - status: string (filter by status)
 * - returnReason: string (filter by reason)
 * 
 * Access: Seller, Warehouse Staff, Admin
 */
router.get(
    '/',
    requireAccess({ roles: ['seller', 'staff', 'admin'] }),
    ReturnController.listReturns
);

/**
 * GET /api/v1/returns/stats
 * Get return analytics and statistics
 * 
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 * 
 * Access: Seller, Admin
 */
router.get(
    '/stats',
    requireAccess({ roles: ['seller', 'admin'] }),
    ReturnController.getReturnStats
);

/**
 * GET /api/v1/returns/:returnId
 * Get detailed return information
 * 
 * Access: Customer (own returns), Seller, Warehouse, Admin
 */
router.get(
    '/:returnId',
    ReturnController.getReturnDetails
);

/**
 * POST /api/v1/returns/:returnId/pickup
 * Schedule pickup for return
 * 
 * Access: Warehouse Staff, Admin
 * Rate Limit: 10 requests per minute
 */
router.post(
    '/:returnId/pickup',
    requireAccess({ roles: ['staff', 'admin'] }),
    apiRateLimiter,
    ReturnController.schedulePickup
);

/**
 * POST /api/v1/returns/:returnId/qc
 * Record QC results
 * 
 * Access: Warehouse QC Staff, Admin
 * Rate Limit: 10 requests per minute
 */
router.post(
    '/:returnId/qc',
    requireAccess({ roles: ['staff', 'admin'] }),
    apiRateLimiter,
    ReturnController.recordQCResult
);

/**
 * POST /api/v1/returns/:returnId/refund
 * Manually trigger refund processing
 * 
 * Access: Admin only
 * Rate Limit: 5 requests per minute
 */
router.post(
    '/:returnId/refund',
    requireAccess({ roles: ['admin'] }),
    apiRateLimiter,
    ReturnController.processRefund
);

/**
 * POST /api/v1/returns/:returnId/cancel
 * Cancel a return request
 * 
 * Access: Customer (own returns), Admin
 * Rate Limit: 5 requests per minute
 */
router.post(
    '/:returnId/cancel',
    apiRateLimiter,
    ReturnController.cancelReturn
);

export default router;
