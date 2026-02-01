import { Router } from 'express';
import controller from '@/presentation/http/controllers/crm/leads/lead.controller';
import { authenticate } from '@/presentation/http/middleware/auth/auth';
import { requirePermission } from '@/presentation/http/middleware/auth/require-permission.middleware';

const router = Router();

router.use(authenticate);

// List and Create
router.get('/', requirePermission('crm_leads:read'), controller.findAll);
router.post('/', requirePermission('crm_leads:create'), controller.create);

// Metrics
router.get('/funnel-metrics', requirePermission('crm_leads:read_metrics'), controller.getFunnelMetrics);

// Specific Lead Operations
router.put('/:id', requirePermission('crm_leads:update'), controller.update);
router.post('/:id/convert', requirePermission('crm_leads:convert'), controller.convert);

export default router;
