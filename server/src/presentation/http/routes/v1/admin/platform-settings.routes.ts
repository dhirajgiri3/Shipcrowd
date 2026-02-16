import express from 'express';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import platformSettingsController from '../../../controllers/admin/platform-settings.controller';
import { requireAccess } from '../../../middleware';
import { authenticate } from '../../../middleware/auth/auth';
import { csrfProtection } from '../../../middleware/auth/csrf';

const router = express.Router();

router.get(
    '/platform',
    authenticate,
    requireAccess({ roles: ['super_admin', 'admin'] }),
    asyncHandler(platformSettingsController.getPlatformSettings)
);

router.put(
    '/platform',
    authenticate,
    csrfProtection,
    requireAccess({ roles: ['super_admin'] }),
    asyncHandler(platformSettingsController.updatePlatformSettings)
);

export default router;
