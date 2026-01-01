/**
 * RTO Routes
 *
 * Endpoints for RTO management.
 */

import { Router } from 'express';
import RTOController from '../../../controllers/rto/rto.controller';
import { authenticate } from '../../../middleware/auth/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * RTO Events
 */
// List all RTO events
router.get('/events', RTOController.listRTOEvents);

// Get pending RTOs
router.get('/pending', RTOController.getPendingRTOs);

// Get single RTO event
router.get('/events/:id', RTOController.getRTOEvent);

// Trigger RTO manually
router.post('/trigger', RTOController.triggerRTO);

// Update RTO status
router.patch('/events/:id/status', RTOController.updateStatus);

// Record QC result
router.post('/events/:id/qc', RTOController.recordQC);

/**
 * RTO Analytics
 */
router.get('/analytics/stats', RTOController.getStats);

export default router;
