import express, { Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import analyticsController from '../../controllers/analytics.controller';

const router = express.Router();

// Type assertion for request handlers
type RequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
const asHandler = (fn: any): RequestHandler => fn as RequestHandler;

/**
 * @route GET /api/v1/analytics/dashboard/seller
 * @desc Get seller dashboard analytics (company-scoped)
 * @access Private
 */
router.get('/dashboard/seller', authenticate, asHandler(analyticsController.getSellerDashboard));

/**
 * @route GET /api/v1/analytics/dashboard/admin
 * @desc Get admin dashboard analytics (multi-company, admin only)
 * @access Private (Admin)
 */
router.get('/dashboard/admin', authenticate, authorize('admin'), asHandler(analyticsController.getAdminDashboard));

/**
 * @route GET /api/v1/analytics/orders
 * @desc Get order trends and statistics
 * @access Private
 */
router.get('/orders', authenticate, asHandler(analyticsController.getOrderTrends));

/**
 * @route GET /api/v1/analytics/shipments
 * @desc Get shipment/delivery performance metrics
 * @access Private
 */
router.get('/shipments', authenticate, asHandler(analyticsController.getShipmentPerformance));

export default router;
