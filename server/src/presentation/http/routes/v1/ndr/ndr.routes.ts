/**
 * NDR Routes
 *
 * Endpoints for NDR management and analytics.
 */

import { Router } from 'express';
import NDRController from '@/presentation/http/controllers/ndr/ndr.controller';
import { authenticate } from '@/presentation/http/middleware/auth/auth';
import { requireAccess } from '@/presentation/http/middleware/auth/unified-access';

const router = Router();

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
router.post('/events/:id/resolve', NDRController.resolveNDR);

// Escalate NDR
router.post('/events/:id/escalate', NDRController.escalateNDR);

// Trigger resolution workflow
router.post('/events/:id/trigger-workflow', NDRController.triggerWorkflow);

/**
 * NDR Analytics
 */
// Get overall statistics
router.get('/analytics/stats', NDRController.getStats);

// Get breakdown by type
router.get('/analytics/by-type', NDRController.getByType);

// Get trends over time
router.get('/analytics/trends', NDRController.getTrends);

// Get resolution rates by action
router.get('/analytics/resolution-rates', NDRController.getResolutionRates);

// Get top NDR reasons
router.get('/analytics/top-reasons', NDRController.getTopReasons);

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
