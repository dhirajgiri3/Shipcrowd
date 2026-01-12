import express from 'express';
import { authenticate, authorize } from '../../../middleware';
import * as walletController from '../../../controllers/finance/wallet.controller';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

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
    authorize(['ADMIN']),
    walletController.refundTransaction
);

export default router;
