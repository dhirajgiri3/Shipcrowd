/**
 * NDR Routes
 *
 * Endpoints for NDR management and analytics.
 */

import NDRAnalyticsController from '@/presentation/http/controllers/ndr/ndr-analytics.controller';
import NDRController from '@/presentation/http/controllers/ndr/ndr.controller';
import { authenticate } from '@/presentation/http/middleware/auth/auth';
import { requireAccess } from '@/presentation/http/middleware/auth/unified-access';
import { Router } from 'express';

const router = Router();
const ndrMutationAccess = requireAccess({ roles: ['seller', 'staff', 'admin'] });

// All routes require authentication
router.use(authenticate);

/**
 * NDR Events
 */
// List all NDR events
router.get('/events', NDRController.listNDREvents);

// Get single NDR event
router.get('/events/:id', NDRController.getNDREvent);

// Resolve NDR manually
router.post('/events/:id/resolve', ndrMutationAccess, NDRController.resolveNDR);

// Execute manual seller/admin action
router.post('/events/:id/action', ndrMutationAccess, NDRController.takeAction);

// Escalate NDR
router.post('/events/:id/escalate', ndrMutationAccess, NDRController.escalateNDR);

// Trigger resolution workflow
router.post('/events/:id/trigger-workflow', ndrMutationAccess, NDRController.triggerWorkflow);

/**
 * NDR Analytics
 */
// Get overall statistics/metrics
router.get('/analytics/stats', NDRAnalyticsController.getStats);

// Get breakdown by type
router.get('/analytics/by-type', NDRController.getByType);

// Get trends over time
router.get('/analytics/trends', NDRController.getTrends);

// Get resolution rates by action
router.get('/analytics/resolution-rates', NDRController.getResolutionRates);

// Get top NDR reasons
router.get('/analytics/top-reasons', NDRController.getTopReasons);

// Phase 6: Enhanced Analytics
router.get('/analytics/self-service', NDRAnalyticsController.getSelfServiceMetrics);
router.get('/analytics/prevention', NDRAnalyticsController.getPreventionMetrics);
router.get('/analytics/roi', NDRAnalyticsController.getROIMetrics);
router.get('/analytics/weekly-trends', NDRAnalyticsController.getWeeklyTrends);

/**
 * Dashboard
 */
router.get('/dashboard', NDRController.getDashboard);

/**
 * Workflows
 */
router.get('/workflows', NDRController.getWorkflows);

// Admin only: Seed default workflows
router.post('/workflows/seed', requireAccess({ roles: ['admin'] }), NDRController.seedWorkflows);

export default router;
