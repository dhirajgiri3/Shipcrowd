import { Router } from 'express';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import adminIntelligenceController from '../../../controllers/admin/admin-intelligence.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/auth/unified-access';

const router = Router();

router.use(authenticate);
router.use(requireAccess({ roles: ['admin', 'super_admin'] }));

router.get('/predictions', asyncHandler(adminIntelligenceController.getPredictions));
router.get('/anomalies', asyncHandler(adminIntelligenceController.getAnomalies));
router.patch('/anomalies/:anomalyId', asyncHandler(adminIntelligenceController.updateAnomalyStatus));
router.get('/demand-forecast', asyncHandler(adminIntelligenceController.getDemandForecast));
router.get('/insights', asyncHandler(adminIntelligenceController.getInsights));

export default router;
