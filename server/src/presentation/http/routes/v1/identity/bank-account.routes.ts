import express from 'express';
import { authenticate } from '../../../middleware/auth/auth';
import bankAccountController from '../../../controllers/identity/bank-account.controller';
import asyncHandler from '../../../../../shared/utils/asyncHandler';

const router = express.Router();

/**
 * @route GET /api/v1/seller/bank-accounts
 * @desc Get all bank accounts
 * @access Private
 */
router.get('/', authenticate, asyncHandler(bankAccountController.getBankAccounts));

/**
 * @route POST /api/v1/seller/bank-accounts
 * @desc Add a bank account
 * @access Private
 */
router.post('/', authenticate, asyncHandler(bankAccountController.addBankAccount));

/**
 * @route DELETE /api/v1/seller/bank-accounts/:id
 * @desc Delete a bank account
 * @access Private
 */
router.delete('/:id', authenticate, asyncHandler(bankAccountController.deleteBankAccount));

export default router;
