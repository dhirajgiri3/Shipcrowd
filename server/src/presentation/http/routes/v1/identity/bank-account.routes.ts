import express from 'express';
import { authenticate, csrfProtection } from '../../../middleware/auth/auth';
import { bankAccountRateLimiter } from '../../../../../shared/config/rateLimit.config';
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
 * @access Private (CSRF + rate limited)
 */
router.post('/', bankAccountRateLimiter, authenticate, csrfProtection, asyncHandler(bankAccountController.addBankAccount));

/**
 * @route PUT /api/v1/seller/bank-accounts/:id/default
 * @desc Set bank account as default (no-op for single-account model)
 * @access Private (CSRF + rate limited)
 */
router.put('/:id/default', bankAccountRateLimiter, authenticate, csrfProtection, asyncHandler(bankAccountController.setDefaultBankAccount));

/**
 * @route DELETE /api/v1/seller/bank-accounts/:id
 * @desc Delete a bank account
 * @access Private (CSRF + rate limited)
 */
router.delete('/:id', bankAccountRateLimiter, authenticate, csrfProtection, asyncHandler(bankAccountController.deleteBankAccount));

export default router;
