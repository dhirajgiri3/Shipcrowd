/**
 * Consent Routes
 * 
 * Purpose: GDPR consent management routes
 * 
 * Routes:
 * - GET /consent - Get user's current consents
 * - POST /consent - Accept a consent
 * - DELETE /consent/:type - Withdraw consent
 * - GET /consent/export - Export user data (GDPR right)
 * - GET /consent/history - Get consent history
 */

import { Router } from 'express';
import { authenticate } from '../../../middleware/auth/auth';
import consentController from '../../../controllers/identity/consent.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /consent
 * @desc    Get user's current consents
 * @access  Private
 */
router.get('/', consentController.getConsents);

/**
 * @route   POST /consent
 * @desc    Accept a consent
 * @access  Private
 * @body    { type: 'terms' | 'privacy' | 'marketing' | 'cookies' | 'data_processing', version?: string }
 */
router.post('/', consentController.acceptConsent);

/**
 * @route   DELETE /consent/:type
 * @desc    Withdraw consent (marketing, cookies, data_processing only)
 * @access  Private
 * @note    Cannot withdraw terms or privacy - must delete account instead
 */
router.delete('/:type', consentController.withdrawConsent);

/**
 * @route   GET /consent/export
 * @desc    Export user data (GDPR right to data portability)
 * @access  Private
 */
router.get('/export', consentController.exportUserData);

/**
 * @route   GET /consent/history
 * @desc    Get consent change history
 * @access  Private
 */
router.get('/history', consentController.getConsentHistory);

export default router;
