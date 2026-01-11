import express from 'express';
import { authenticate } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/index';
import { AccessTier } from '../../../../../core/domain/types/access-tier';
import analyticsController from '../../../controllers/analytics/analytics.controller';
import asyncHandler from '../../../../../shared/utils/asyncHandler';

const router = express.Router();

/**
 * @route GET /api/v1/analytics/dashboard/seller
 * @desc Get seller dashboard analytics (company-scoped)
 * @access Private
 */
router.get(
    '/dashboard/seller',
    authenticate,
    requireAccess({ tier: AccessTier.SANDBOX }),
    asyncHandler(analyticsController.getSellerDashboard)
);

/**
 * @route GET /api/v1/analytics/dashboard/admin
 * @desc Get admin dashboard analytics (multi-company, admin only)
 * @access Private (Admin)
 */
router.get(
    '/dashboard/admin',
    authenticate,
    requireAccess({ roles: ['admin'] }),
    asyncHandler(analyticsController.getAdminDashboard)
);

/**
 * @route GET /api/v1/analytics/orders
 * @desc Get order trends and statistics
 * @access Private
 */
router.get('/orders', authenticate, asyncHandler(analyticsController.getOrderTrends));

/**
 * @route GET /api/v1/analytics/shipments
 * @desc Get shipment/delivery performance metrics
 * @access Private
 */
router.get('/shipments', authenticate, asyncHandler(analyticsController.getShipmentPerformance));

// ============================================
// Week 9: New Analytics Routes
// ============================================

/**
 * Revenue Analytics
 */
router.get('/revenue/stats', authenticate, asyncHandler(analyticsController.getRevenueStats));
router.get('/revenue/wallet', authenticate, asyncHandler(analyticsController.getWalletStats));

/**
 * Customer Analytics
 */
router.get('/customers/stats', authenticate, asyncHandler(analyticsController.getCustomerStats));
router.get('/customers/top', authenticate, asyncHandler(analyticsController.getTopCustomers));

/**
 * Inventory Analytics
 */
router.get('/inventory/stats', authenticate, asyncHandler(analyticsController.getInventoryStats));

/**
 * Order Analytics - Additional
 */
router.get('/orders/top-products', authenticate, asyncHandler(analyticsController.getTopProducts));

/**
 * Report Builder
 */
router.get('/reports', authenticate, asyncHandler(analyticsController.listReportConfigs));
router.post('/reports/build', authenticate, asyncHandler(analyticsController.buildCustomReport));
router.post('/reports/save', authenticate, asyncHandler(analyticsController.saveReportConfig));
router.delete('/reports/:id', authenticate, asyncHandler(analyticsController.deleteReportConfig));

// ✅ FEATURE 10: Authentication Analytics Dashboard
import authAnalyticsRouter from '../analytics/auth.routes';
router.use('/auth', authAnalyticsRouter);

export default router;