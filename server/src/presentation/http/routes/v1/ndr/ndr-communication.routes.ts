import { Router } from 'express';
import { apiRateLimiter } from '../../../../../shared/config/rateLimit.config';
import NDRCommunicationController from '../../../controllers/ndr/ndr-communication.controller';
import { authenticate } from '../../../middleware/auth/auth';

const router = Router();

/**
 * NDR Communication Routes
 * All routes require authentication
 */

// Send NDR notification
router.post(
    '/:id/notify',
    authenticate,
    apiRateLimiter,
    NDRCommunicationController.sendNDRNotification
);

// Bulk NDR notifications
router.post(
    '/bulk-notify',
    authenticate,
    apiRateLimiter,
    NDRCommunicationController.sendBulkNotifications
);

// Send status update (generalized)
router.post(
    '/shipments/:id/status-update',
    authenticate,
    apiRateLimiter,
    NDRCommunicationController.sendStatusUpdate
);

// Get available templates
router.get(
    '/templates',
    authenticate,
    NDRCommunicationController.getTemplates
);

export default router;
