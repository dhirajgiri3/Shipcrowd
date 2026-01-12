/**
 * Integrations Routes
 *
 * Cross-platform integration endpoints
 */

import express from 'express';
import IntegrationsController from '../../../controllers/integrations/integrations.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/auth/unified-access';

const router = express.Router();

/**
 * GET /api/v1/integrations/health
 * Get health status of all platform integrations
 *
 * Access: Authenticated users (ADMIN, COMPANY_OWNER, MANAGER)
 *
 * Returns comprehensive health data including:
 * - Active/inactive store counts per platform
 * - Last sync timestamps
 * - Error rates (24h, 7d)
 * - Sync success rates
 * - Webhook delivery status
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "companyId": "...",
 *     "timestamp": "2026-01-08T...",
 *     "platforms": {
 *       "shopify": { ... },
 *       "woocommerce": { ... }
 *     },
 *     "summary": {
 *       "totalStores": 5,
 *       "activeStores": 4,
 *       "healthyStores": 3,
 *       "unhealthyStores": 1
 *     }
 *   }
 * }
 */
router.get(
    '/health',
    authenticate,
    requireAccess({ teamRoles: ['owner', 'admin', 'manager'] }),
    IntegrationsController.getHealth
);

export default router;
