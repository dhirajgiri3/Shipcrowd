import express from 'express';
import { bankAccountRateLimiter } from '../../../../../shared/config/rateLimit.config';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import bankAccountController from '../../../controllers/identity/bank-account.controller';
import { authenticate, csrfProtection } from '../../../middleware/auth/auth';

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
 * @access Private (CSRF + rate limited)
 */
router.post('/', authenticate, bankAccountRateLimiter, csrfProtection, asyncHandler(bankAccountController.addBankAccount));

/**
 * @route PUT /api/v1/seller/bank-accounts/:id/default
 * @desc Set bank account as default
 * @access Private (CSRF + rate limited)
 */
router.put('/:id/default', authenticate, bankAccountRateLimiter, csrfProtection, asyncHandler(bankAccountController.setDefaultBankAccount));

/**
 * @route DELETE /api/v1/seller/bank-accounts/:id
 * @desc Delete a bank account
 * @access Private (CSRF + rate limited)
 */
router.delete('/:id', authenticate, bankAccountRateLimiter, csrfProtection, asyncHandler(bankAccountController.deleteBankAccount));

export default router;
