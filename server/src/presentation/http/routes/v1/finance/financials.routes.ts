import express from 'express';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import walletController from '../../../controllers/finance/wallet.controller';
import { authenticate } from '../../../middleware/auth/auth';

const router = express.Router();

/**
 * @route GET /api/v1/finance/financials/overview
 * @desc Get financial overview (Wallet Balance)
 * @access Private
 */
router.get('/overview', authenticate, asyncHandler(walletController.getBalance));

/**
 * @route GET /api/v1/finance/financials/transactions
 * @desc Get financial transactions
 * @access Private
 */
router.get('/transactions', authenticate, asyncHandler(walletController.getTransactionHistory));

export default router;
