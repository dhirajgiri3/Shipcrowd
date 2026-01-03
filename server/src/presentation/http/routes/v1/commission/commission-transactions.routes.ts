/**
 * Commission Transactions Routes
 * 
 * Routes for commission transaction management
 */

import { Router } from 'express';
import { CommissionTransactionController } from '../../../controllers/commission/index';
import { authenticate, authorize } from '../../../middleware/index';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /commission/transactions
 * List all transactions with filters
 * Auth: authenticated
 */
router.get('/', CommissionTransactionController.listTransactions);

/**
 * GET /commission/transactions/pending
 * Get pending transactions for approval
 * Auth: admin, manager
 */
router.get('/pending', authorize(['admin', 'manager']), CommissionTransactionController.getPending);

/**
 * POST /commission/transactions/bulk-approve
 * Bulk approve transactions
 * Auth: admin, manager
 */
router.post('/bulk-approve', authorize(['admin', 'manager']), CommissionTransactionController.bulkApprove);

/**
 * POST /commission/transactions/bulk-reject
 * Bulk reject transactions
 * Auth: admin, manager
 */
router.post('/bulk-reject', authorize(['admin', 'manager']), CommissionTransactionController.bulkReject);

/**
 * POST /commission/transactions/bulk-calculate
 * Bulk calculate commissions
 * Auth: admin, manager
 */
router.post('/bulk-calculate', authorize(['admin', 'manager']), CommissionTransactionController.bulkCalculate);

/**
 * GET /commission/transactions/:id
 * Get a single transaction
 * Auth: authenticated
 */
router.get('/:id', CommissionTransactionController.getTransaction);

/**
 * POST /commission/transactions/:id/approve
 * Approve a transaction
 * Auth: admin, manager
 */
router.post('/:id/approve', authorize(['admin', 'manager']), CommissionTransactionController.approveTransaction);

/**
 * POST /commission/transactions/:id/reject
 * Reject a transaction
 * Auth: admin, manager
 */
router.post('/:id/reject', authorize(['admin', 'manager']), CommissionTransactionController.rejectTransaction);

/**
 * POST /commission/transactions/:id/adjustment
 * Add adjustment to a transaction
 * Auth: admin, manager
 */
router.post('/:id/adjustment', authorize(['admin', 'manager']), CommissionTransactionController.addAdjustment);

export default router;
