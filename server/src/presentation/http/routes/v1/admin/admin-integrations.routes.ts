import { Router } from 'express';
import adminIntegrationsController from '../../../controllers/admin/admin-integrations.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/index';

const router = Router();

router.use(authenticate);
router.use(requireAccess({ roles: ['admin', 'super_admin'] }));

router.get('/health', adminIntegrationsController.getPlatformIntegrationHealth);

export default router;
