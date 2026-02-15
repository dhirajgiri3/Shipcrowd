import { Router } from 'express';
import { CommissionAnalyticsController } from '../../../controllers/commission/index';
import { requireAccess } from '../../../middleware/auth/unified-access';
import { authenticate } from '../../../middleware/index';
const router = Router();

// All routes require authentication
router.use(authenticate);

// All analytics routes require KYC verification
router.use(requireAccess({ kyc: true }));

// Admin/manager auth
const adminManager = requireAccess({ teamRoles: ['admin', 'manager'] });

// Analytics routes (admin/manager)
router.get('/metrics', adminManager, CommissionAnalyticsController.getMetrics);
router.get('/top-performers', adminManager, CommissionAnalyticsController.getTopPerformers);
router.get('/trend', adminManager, CommissionAnalyticsController.getTrend);
router.get('/dashboard/:salesRepId', CommissionAnalyticsController.getSalesRepDashboard);
router.get('/payout-stats', adminManager, CommissionAnalyticsController.getPayoutStats);
router.post('/reports', adminManager, CommissionAnalyticsController.generateReport);

export default router;
