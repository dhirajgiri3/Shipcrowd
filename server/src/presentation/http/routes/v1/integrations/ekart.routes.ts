/**
 * Ekart Integration Routes
 * 
 * Endpoints for managing Ekart courier credentials
 */

import express from 'express';
import EkartController from '../../../controllers/integrations/ekart.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/auth/unified-access';

const router = express.Router();

/**
 * POST /api/v1/integrations/ekart/config
 * Save or update Ekart API credentials
 * 
 * Access: Admin only
 */
router.post(
    '/config',
    authenticate,
    requireAccess({ teamRoles: ['owner', 'admin'] }),
    EkartController.saveConfig
);

/**
 * GET /api/v1/integrations/ekart/config
 * Get Ekart integration status
 * 
 * Access: Admin only
 */
router.get(
    '/config',
    authenticate,
    requireAccess({ teamRoles: ['owner', 'admin'] }),
    EkartController.getConfig
);

export default router;
