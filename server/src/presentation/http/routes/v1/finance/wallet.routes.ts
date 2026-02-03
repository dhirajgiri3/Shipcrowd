import express from 'express';
import { authenticate } from '../../../middleware';
import { requireAccess } from '../../../middleware/auth/unified-access';
import * as walletController from '../../../controllers/finance/wallet.controller';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// All wallet routes require KYC verification
router.use(requireAccess({ kyc: true }));

// Get wallet balance
router.get('/balance', walletController.getBalance);

// Get available balance (Phase 2: Dashboard Optimization) - Calculated metric
router.get('/available-balance', walletController.getAvailableBalance);

// Get 7-day cash flow forecast (Phase 3)
router.get('/cash-flow-forecast', walletController.getCashFlowForecast);

// Get transaction history
router.get('/transactions', walletController.getTransactionHistory);

// Recharge wallet
router.post('/recharge', walletController.rechargeWallet);

// Get wallet statistics
router.get('/stats', walletController.getWalletStats);

// Get spending insights (week-over-week, categories)
router.get('/insights', walletController.getSpendingInsights);

// Get wallet trends (projections, weekly change)
router.get('/trends', walletController.getWalletTrends);

// Update low balance threshold
router.put('/threshold', walletController.updateLowBalanceThreshold);

// Auto-recharge settings
router.get('/auto-recharge/settings', walletController.getAutoRechargeSettings);
router.put('/auto-recharge/settings', walletController.updateAutoRechargeSettings);

// Refund transaction (admin action)
router.post(
    '/refund/:transactionId',
    requireAccess({ roles: ['admin'] }),
    walletController.refundTransaction
);

export default router;
