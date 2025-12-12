import express from 'express';
import recoveryController from '../../controllers/recovery.controller';
import { authenticate, csrfProtection } from '../../middleware/auth';

const router = express.Router();

/**
 * @route GET /recovery/security-questions
 * @desc Get available security questions
 * @access Public
 */
router.get('/security-questions', recoveryController.getSecurityQuestions);

/**
 * @route POST /recovery/setup-questions
 * @desc Set up security questions
 * @access Private
 */
router.post('/setup-questions', authenticate, csrfProtection, recoveryController.setupSecurityQuestionsHandler);

/**
 * @route POST /recovery/setup-backup-email
 * @desc Set up backup email
 * @access Private
 */
router.post('/setup-backup-email', authenticate, csrfProtection, recoveryController.setupBackupEmailHandler);

/**
 * @route POST /recovery/generate-keys
 * @desc Generate recovery keys
 * @access Private
 */
router.post('/generate-keys', authenticate, csrfProtection, recoveryController.generateRecoveryKeysHandler);

/**
 * @route GET /recovery/status
 * @desc Get recovery options status
 * @access Private
 */
router.get('/status', authenticate, recoveryController.getRecoveryStatus);

/**
 * @route POST /recovery/send-options
 * @desc Send recovery options email
 * @access Public
 */
router.post('/send-options', csrfProtection, recoveryController.sendRecoveryOptionsHandler);

export default router;
