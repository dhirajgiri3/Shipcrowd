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

// Get transaction history
router.get('/transactions', walletController.getTransactionHistory);

// Recharge wallet
router.post('/recharge', walletController.rechargeWallet);

// Get wallet statistics
router.get('/stats', walletController.getWalletStats);

// Update low balance threshold
router.put('/threshold', walletController.updateLowBalanceThreshold);

// Refund transaction (admin action)
router.post(
    '/refund/:transactionId',
    requireAccess({ roles: ['admin'] }),
    walletController.refundTransaction
);

export default router;
