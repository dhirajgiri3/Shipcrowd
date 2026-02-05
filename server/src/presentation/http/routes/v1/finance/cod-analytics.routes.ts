import express from 'express';
import { authenticate } from '@/presentation/http/middleware';
import { CODAnalyticsController } from '@/presentation/http/controllers/finance/cod-analytics.controller';

const router = express.Router();

// Apply auth middleware
router.use(authenticate);

// COD Analytics Endpoints
// Base path: /api/v1/finance/cod/analytics (configured in index.ts)

router.get('/forecast', CODAnalyticsController.getForecast);
router.get('/health', CODAnalyticsController.getHealthMetrics);
router.get('/carrier-performance', CODAnalyticsController.getCarrierPerformance);

export default router;
