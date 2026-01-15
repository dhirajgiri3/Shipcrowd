/**
 * Return Routes
 * 
 * RESTful API routes for returns management
 * 
 * Base URL: /api/v1/returns
 */

import { Router } from 'express';
import ReturnController from '@/presentation/http/controllers/logistics/return.controller';
import { authenticate } from '@/presentation/http/middlewares/auth.middleware';
import { authorize } from '@/presentation/http/middlewares/authorization.middleware';
import { rateLimiter } from '@/presentation/http/middlewares/rate-limiter.middleware';

const router = Router();

// Apply authentication to all routes
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
    rateLimiter({ max: 5, windowMs: 60 * 1000 }),
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
    authorize(['seller', 'warehouse_staff', 'admin']),
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
    authorize(['seller', 'admin']),
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
    authorize(['warehouse_staff', 'admin']),
    rateLimiter({ max: 10, windowMs: 60 * 1000 }),
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
    authorize(['warehouse_staff', 'qc_staff', 'admin']),
    rateLimiter({ max: 10, windowMs: 60 * 1000 }),
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
    authorize(['admin']),
    rateLimiter({ max: 5, windowMs: 60 * 1000 }),
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
    rateLimiter({ max: 5, windowMs: 60 * 1000 }),
    ReturnController.cancelReturn
);

export default router;
