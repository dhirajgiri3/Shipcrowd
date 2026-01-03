/**
 * Commission Analytics Routes
 */

import { Router } from 'express';
import { CommissionAnalyticsController } from '../../../controllers/commission/index';
import { authenticate, authorize } from '../../../middleware/index';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Analytics routes (admin/manager)
router.get('/metrics', authorize(['admin', 'manager']), CommissionAnalyticsController.getMetrics);
router.get('/top-performers', authorize(['admin', 'manager']), CommissionAnalyticsController.getTopPerformers);
router.get('/trend', authorize(['admin', 'manager']), CommissionAnalyticsController.getTrend);
router.get('/dashboard/:salesRepId', CommissionAnalyticsController.getSalesRepDashboard);
router.get('/payout-stats', authorize(['admin', 'manager']), CommissionAnalyticsController.getPayoutStats);
router.post('/reports', authorize(['admin', 'manager']), CommissionAnalyticsController.generateReport);

export default router;
