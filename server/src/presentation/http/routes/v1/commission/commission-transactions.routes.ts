/**
 * Commission Transactions Routes
 * 
 * Routes for commission transaction management
 */

import { Router } from 'express';
import { CommissionTransactionController } from '../../../controllers/commission/index';
import { requireAccess } from '../../../middleware/auth/unified-access';
import { authenticate } from '../../../middleware/index';

const router = Router();

// All routes require authentication
router.use(authenticate);

// All commission transaction routes require KYC verification
// All commission transaction routes require KYC verification
router.use(requireAccess({ kyc: true }));

// Admin/manager auth
const adminManager = requireAccess({ teamRoles: ['admin', 'manager'] });

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
router.get('/pending', adminManager, CommissionTransactionController.getPending);

/**
 * POST /commission/transactions/bulk-approve
 * Bulk approve transactions
 * Auth: admin, manager
 */
router.post('/bulk-approve', adminManager, CommissionTransactionController.bulkApprove);

/**
 * POST /commission/transactions/bulk-reject
 * Bulk reject transactions
 * Auth: admin, manager
 */
router.post('/bulk-reject', adminManager, CommissionTransactionController.bulkReject);

/**
 * POST /commission/transactions/bulk-calculate
 * Bulk calculate commissions
 * Auth: admin, manager
 */
router.post('/bulk-calculate', adminManager, CommissionTransactionController.bulkCalculate);

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
router.post('/:id/approve', adminManager, CommissionTransactionController.approveTransaction);

/**
 * POST /commission/transactions/:id/reject
 * Reject a transaction
 * Auth: admin, manager
 */
router.post('/:id/reject', adminManager, CommissionTransactionController.rejectTransaction);

/**
 * POST /commission/transactions/:id/adjustment
 * Add adjustment to a transaction
 * Auth: admin, manager
 */
router.post('/:id/adjustment', adminManager, CommissionTransactionController.addAdjustment);

export default router;
