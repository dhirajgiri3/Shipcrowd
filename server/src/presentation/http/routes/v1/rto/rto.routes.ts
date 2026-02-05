/**
 * RTO Routes
 *
 * Endpoints for RTO management.
 */

import { Router } from 'express';
import multer from 'multer';
import RTOController from '@/presentation/http/controllers/rto/rto.controller';
import { authenticate } from '@/presentation/http/middleware/auth/auth';

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 10 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed'));
    },
});

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

// Upload QC photos (before recording QC)
router.post('/events/:id/qc/upload', upload.array('photos', 10), RTOController.uploadQCPhotos);
// Record QC result
router.post('/events/:id/qc', RTOController.recordQC);

// Disposition (suggest + execute)
router.get('/events/:id/disposition/suggest', RTOController.suggestDisposition);
router.post('/events/:id/disposition/execute', RTOController.executeDisposition);

/**
 * RTO Analytics
 */
router.get('/analytics/stats', RTOController.getStats);

export default router;
