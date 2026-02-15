import controller from '@/presentation/http/controllers/crm/sales-rep.controller';
import { authenticate } from '@/presentation/http/middleware/auth/auth';
import { requirePermission } from '@/presentation/http/middleware/auth/require-permission.middleware';
import { Router } from 'express';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticate);

// List and Create
router.get('/', requirePermission('sales_rep:read'), controller.getSalesReps);
router.post('/', requirePermission('sales_rep:create'), controller.createSalesRep);

// Specific Rep Operations
router.get('/:id', requirePermission('sales_rep:read'), controller.getSalesRepById);
router.put('/:id', requirePermission('sales_rep:update'), controller.updateSalesRep);

// Performance Metrics
router.get('/:id/performance', requirePermission('sales_rep:read_performance'), controller.getPerformanceMetrics);

export default router;
