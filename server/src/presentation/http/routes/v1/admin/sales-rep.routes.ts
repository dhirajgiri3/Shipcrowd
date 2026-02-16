import controller from '@/presentation/http/controllers/crm/sales-rep.controller';
import { authenticate } from '@/presentation/http/middleware/auth/auth';
import { requireAccess } from '@/presentation/http/middleware/index';
import { Router } from 'express';

const router = Router();

router.use(authenticate);
router.use(requireAccess({ roles: ['admin', 'super_admin'] }));

router.get('/', controller.getSalesReps);
router.post('/', controller.createSalesRep);
router.get('/:id', controller.getSalesRepById);
router.put('/:id', controller.updateSalesRep);
router.get('/:id/performance', controller.getPerformanceMetrics);

export default router;
