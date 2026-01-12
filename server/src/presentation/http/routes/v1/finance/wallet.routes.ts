import express from 'express';
import { authenticate } from '../../../middleware';
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

// Refund transaction (admin action - can add role check if needed)
router.post('/refund/:transactionId', walletController.refundTransaction);

export default router;
