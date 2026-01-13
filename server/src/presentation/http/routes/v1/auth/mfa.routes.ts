import { Router } from 'express';
import MFAController from '../../../controllers/auth/mfa.controller';
import { authenticate } from '../../../middleware/auth/auth';
import {
    apiRateLimiter,
    loginRateLimiter
} from '../../../middleware/system/rate-limiter.middleware';


const router = Router();

/**
 * MFA Routes
 * All routes require authentication except mfa-verify (uses temp token)
 */

// Setup TOTP - Generate QR code
router.post(
    '/setup-totp',
    authenticate,
    apiRateLimiter,
    MFAController.setupTOTP
);

// Verify TOTP and enable MFA
router.post(
    '/verify-totp',
    authenticate,
    loginRateLimiter,
    MFAController.verifyTOTP
);

// Disable MFA (requires password)
router.post(
    '/disable-totp',
    authenticate,
    apiRateLimiter,
    MFAController.disableTOTP
);

// Generate backup codes
router.get(
    '/backup-codes',
    authenticate,
    apiRateLimiter,
    MFAController.getBackupCodes
);

// Use backup code
router.post(
    '/use-backup-code',
    authenticate,
    loginRateLimiter,
    MFAController.useBackupCode
);

// Get MFA status
router.get(
    '/status',
    authenticate,
    MFAController.getStatus
);

// Admin: Enforce MFA for company
router.post(
    '/enforce',
    authenticate,
    // TODO: Add admin role middleware
    MFAController.enforceMFA
);

export default router;
