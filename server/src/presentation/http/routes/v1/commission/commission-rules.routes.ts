/**
 * Commission Rules Routes
 * 
 * Routes for commission rule management
 */

import { Router } from 'express';
import { CommissionRuleController } from '../../../controllers/commission/index.js';
import { authenticate, authorize } from '../../../middleware/index.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /commission/rules
 * Create a new commission rule
 * Auth: admin, manager
 */
router.post('/', authorize(['admin', 'manager']), CommissionRuleController.createRule);

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
router.put('/:id', authorize(['admin', 'manager']), CommissionRuleController.updateRule);

/**
 * DELETE /commission/rules/:id
 * Delete (soft delete) a commission rule
 * Auth: admin
 */
router.delete('/:id', authorize(['admin']), CommissionRuleController.deleteRule);

/**
 * POST /commission/rules/:id/test
 * Test a commission rule with sample data
 * Auth: admin, manager
 */
router.post('/:id/test', authorize(['admin', 'manager']), CommissionRuleController.testRule);

/**
 * POST /commission/rules/:id/clone
 * Clone a commission rule
 * Auth: admin, manager
 */
router.post('/:id/clone', authorize(['admin', 'manager']), CommissionRuleController.cloneRule);

export default router;
