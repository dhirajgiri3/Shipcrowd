/**
 * Sales Representatives Routes
 * 
 * Routes for sales representative management
 */

import { Router } from 'express';
import { SalesRepresentativeController } from '../../../controllers/commission/index';
import { requireAccess } from '../../../middleware/auth/unified-access';
import { authenticate } from '../../../middleware/index';

const router = Router();

// All routes require authentication
router.use(authenticate);

// All sales representative routes require KYC verification
// All sales representative routes require KYC verification
router.use(requireAccess({ kyc: true }));

/**
 * POST /commission/sales-reps
 * Create a new sales representative
 * Auth: admin, manager
 */
router.post('/', requireAccess({ teamRoles: ['admin', 'manager'] }), SalesRepresentativeController.createSalesRep);

/**
 * GET /commission/sales-reps
 * List all sales representatives
 * Auth: authenticated
 */
router.get('/', SalesRepresentativeController.listSalesReps);

/**
 * GET /commission/sales-reps/:id
 * Get a single sales representative
 * Auth: authenticated (self or manager)
 */
router.get('/:id', SalesRepresentativeController.getSalesRep);

/**
 * PUT /commission/sales-reps/:id
 * Update a sales representative
 * Auth: admin, manager (self with limited fields)
 */
router.put('/:id', requireAccess({ teamRoles: ['admin', 'manager'] }), SalesRepresentativeController.updateSalesRep);

/**
 * DELETE /commission/sales-reps/:id
 * Deactivate a sales representative
 * Auth: admin
 */
router.delete('/:id', requireAccess({ teamRoles: ['admin'] }), SalesRepresentativeController.deleteSalesRep);

/**
 * GET /commission/sales-reps/:id/performance
 * Get performance metrics
 * Auth: authenticated (self)
 */
router.get('/:id/performance', SalesRepresentativeController.getPerformance);

/**
 * PUT /commission/sales-reps/:id/territory
 * Assign territories
 * Auth: admin, manager
 */
router.put('/:id/territory', requireAccess({ teamRoles: ['admin', 'manager'] }), SalesRepresentativeController.assignTerritory);

/**
 * POST /commission/sales-reps/:id/refresh-metrics
 * Refresh cached performance metrics
 * Auth: admin, manager
 */
router.post('/:id/refresh-metrics', requireAccess({ teamRoles: ['admin', 'manager'] }), SalesRepresentativeController.refreshMetrics);

/**
 * GET /commission/sales-reps/:id/team
 * Get team hierarchy
 * Auth: admin, manager
 */
router.get('/:id/team', requireAccess({ teamRoles: ['admin', 'manager'] }), SalesRepresentativeController.getTeam);

export default router;
