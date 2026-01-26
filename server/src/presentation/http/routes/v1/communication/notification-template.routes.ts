import { Router } from 'express';
import NotificationTemplateController from '../../../controllers/communication/notification-template.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { apiRateLimiter } from '../../../middleware/system/rate-limiter.middleware';

const router = Router();

/**
 * Notification Template Routes
 * All routes require authentication
 *
 * Admin-only routes:
 * - POST /seed-defaults
 * - Create global templates (companyId: null)
 */

// Seed default templates (admin only)
router.post(
    '/templates/seed-defaults',
    authenticate,
    apiRateLimiter,
    NotificationTemplateController.seedDefaultTemplates
);

// Get template statistics
router.get(
    '/templates/stats',
    authenticate,
    NotificationTemplateController.getTemplateStats
);

// Get default template for category/channel
router.get(
    '/templates/default/:category/:channel',
    authenticate,
    NotificationTemplateController.getDefaultTemplate
);

// Render template by code
router.post(
    '/templates/render-by-code',
    authenticate,
    apiRateLimiter,
    NotificationTemplateController.renderTemplateByCode
);

// Get template by code
router.get(
    '/templates/code/:code',
    authenticate,
    NotificationTemplateController.getTemplateByCode
);

// Render template with variables
router.post(
    '/templates/:id/render',
    authenticate,
    apiRateLimiter,
    NotificationTemplateController.renderTemplate
);

// Create template
router.post(
    '/templates',
    authenticate,
    apiRateLimiter,
    NotificationTemplateController.createTemplate
);

// List templates
router.get(
    '/templates',
    authenticate,
    NotificationTemplateController.listTemplates
);

// Get template details
router.get(
    '/templates/:id',
    authenticate,
    NotificationTemplateController.getTemplate
);

// Update template
router.patch(
    '/templates/:id',
    authenticate,
    apiRateLimiter,
    NotificationTemplateController.updateTemplate
);

// Delete template
router.delete(
    '/templates/:id',
    authenticate,
    apiRateLimiter,
    NotificationTemplateController.deleteTemplate
);

export default router;
