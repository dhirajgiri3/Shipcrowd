import express from 'express';
import emailController from '../controllers/email.controller';
import { authenticate, csrfProtection } from '../middleware/auth';

const router = express.Router();

/**
 * @route POST /email/change
 * @desc Request email change
 * @access Private
 */
router.post('/change', authenticate, csrfProtection, emailController.requestEmailChangeHandler);

/**
 * @route POST /email/verify
 * @desc Verify email change
 * @access Public
 */
router.post('/verify', csrfProtection, emailController.verifyEmailChangeHandler);

/**
 * @route POST /email/cancel-change
 * @desc Cancel email change
 * @access Private
 */
router.post('/cancel-change', authenticate, csrfProtection, emailController.cancelEmailChangeHandler);

/**
 * @route GET /email/change-status
 * @desc Get pending email change status
 * @access Private
 */
router.get('/change-status', authenticate, emailController.getEmailChangeStatus);

export default router;
