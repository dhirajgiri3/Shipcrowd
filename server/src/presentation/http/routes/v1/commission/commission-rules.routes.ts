/**
 * Commission Rules Routes
 * 
 * Routes for commission rule management
 */

import { Router } from 'express';
import { CommissionRuleController } from '../../../controllers/commission/index';
import { authenticate } from '../../../middleware/index';
import { requireAccess } from '../../../middleware/auth/unified-access';

const router = Router();

// All routes require authentication
router.use(authenticate);

// All commission rule routes require KYC verification
// All commission rule routes require KYC verification
router.use(requireAccess({ kyc: true }));

/**
 * POST /commission/rules
 * Create a new commission rule
 * Auth: admin, manager
 */
router.post('/', requireAccess({ teamRoles: ['admin', 'manager'] }), CommissionRuleController.createRule);

/**
 * GET /commission/rules
 * List all commission rules
 * Auth: authenticated
 */
router.get('/', CommissionRuleController.listRules);

/**
 * GET /commission/rules/applicable/:orderId
 * Find applicable rules for an order
 * Auth: authenticated
 */
router.get('/applicable/:orderId', CommissionRuleController.findApplicableRules);

/**
 * GET /commission/rules/:id
 * Get a single commission rule
 * Auth: authenticated
 */
router.get('/:id', CommissionRuleController.getRule);

/**
 * PUT /commission/rules/:id
 * Update a commission rule
 * Auth: admin, manager
 */
router.put('/:id', requireAccess({ teamRoles: ['admin', 'manager'] }), CommissionRuleController.updateRule);

/**
 * DELETE /commission/rules/:id
 * Delete (soft delete) a commission rule
 * Auth: admin
 */
router.delete('/:id', requireAccess({ teamRoles: ['admin'] }), CommissionRuleController.deleteRule);

/**
 * POST /commission/rules/:id/test
 * Test a commission rule with sample data
 * Auth: admin, manager
 */
router.post('/:id/test', requireAccess({ teamRoles: ['admin', 'manager'] }), CommissionRuleController.testRule);

/**
 * POST /commission/rules/:id/clone
 * Clone a commission rule
 * Auth: admin, manager
 */
router.post('/:id/clone', requireAccess({ teamRoles: ['admin', 'manager'] }), CommissionRuleController.cloneRule);

export default router;
