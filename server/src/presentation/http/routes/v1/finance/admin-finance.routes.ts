import { Router } from 'express';
import { authenticate } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/index';
import adminFinanceController from '../../../controllers/finance/admin-finance.controller';

const router = Router();

// All routes require admin authentication
router.use(authenticate);
router.use(requireAccess({ roles: ['admin', 'super_admin'] }));

/**
 * @route   GET /api/v1/admin/finance/transactions
 * @desc    Get all wallet transactions (admin view, can filter by companyId)
 * @access  Admin
 */
router.get('/transactions', adminFinanceController.getAllTransactions);

/**
 * @route   GET /api/v1/admin/finance/wallets
 * @desc    Get all company wallets
 * @access  Admin
 */
router.get('/wallets', adminFinanceController.getAllWallets);

/**
 * @route   GET /api/v1/admin/finance/wallets/:companyId
 * @desc    Get specific company wallet
 * @access  Admin
 */
router.get('/wallets/:companyId', adminFinanceController.getWalletByCompanyId);

/**
 * @route   GET /api/v1/admin/finance/stats
 * @desc    Get aggregated finance statistics
 * @access  Admin
 */
router.get('/stats', adminFinanceController.getFinanceStats);

export default router;
