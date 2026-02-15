import express from 'express';
import passport from 'passport';
import {
changeEmailRateLimiter,
changePasswordRateLimiter,
emailVerificationRateLimiter,
loginRateLimiter,
magicLinkRateLimiter,
passwordResetRateLimiter,
registrationRateLimiter,
resendVerificationRateLimiter,
setPasswordRateLimiter,
} from '../../../../../shared/config/rateLimit.config';
import authController from '../../../controllers/auth/auth.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { csrfProtection } from '../../../middleware/auth/csrf';
import mfaRoutes from './mfa.routes';

const router = express.Router();

// Mount MFA routes
router.use('/mfa', mfaRoutes);


/**
 * @route GET /auth/csrf-token
 * @desc Generate and return a CSRF token (stored in Redis)
 * @access Public (session created automatically if not exists)
 * @security Uses new Redis-based CSRF token validation
 */
router.get('/csrf-token', authController.getCSRFToken);


/**
 * @route POST /auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', registrationRateLimiter, authController.register);

/**
 * @route POST /auth/login
 * @desc Login a user
 * @access Public
 */
router.post('/login', loginRateLimiter, authController.login);

/**
 * @route POST /auth/refresh
 * @desc Refresh access token
 * @access Public
 */
router.post('/refresh', authController.refreshToken);

/**
 * @route POST /auth/reset-password
 * @desc Request password reset
 * @access Public
 */
router.post('/reset-password', passwordResetRateLimiter, authController.requestPasswordReset);

/**
 * @route POST /auth/reset-password/confirm
 * @desc Reset password with token
 * @access Public
 */
router.post('/reset-password/confirm', passwordResetRateLimiter, authController.resetPassword);

/**
 * @route POST /auth/verify-email
 * @desc Verify email with token
 * @access Public
 */
router.post('/verify-email', emailVerificationRateLimiter, authController.verifyEmail);

/**
 * @route POST /auth/resend-verification
 * @desc Resend verification email
 * @access Public
 */
router.post('/resend-verification', resendVerificationRateLimiter, authController.resendVerificationEmail); // ✅ FEATURE 22

/**
 * @route POST /auth/magic-link
 * @desc Request magic link for passwordless login
 * @access Public
 */
router.post('/magic-link', magicLinkRateLimiter, authController.requestMagicLink);

/**
 * @route POST /auth/verify-magic-link
 * @desc Verify magic link and log in
 * @access Public
 */
router.post('/verify-magic-link', authController.verifyMagicLink);

// ✅ FEATURE 9: Account Recovery (Email Verification)
import recoveryController from '../../../controllers/auth/recovery.controller';

/**
 * @route POST /auth/recovery/request-unlock
 * @desc Request account recovery email for locked accounts
 * @access Public
 */
router.post(
  '/recovery/request-unlock',
  emailVerificationRateLimiter,
  recoveryController.requestAccountRecovery
);

/**
 * @route POST /auth/recovery/verify-unlock
 * @desc Verify recovery token and unlock account
 * @access Public
 */
router.post(
  '/recovery/verify-unlock',
  emailVerificationRateLimiter,
  recoveryController.verifyRecoveryToken
);

/**
 * @route POST /auth/check-password-strength
 * @desc Check password strength
 * @access Public
 */
router.post('/check-password-strength', authController.checkPasswordStrength);

/**
 * @route GET /auth/me
 * @desc Get current authenticated user
 * @access Private
 */
router.get('/me', authenticate, authController.getMe);

/**
 * @route GET /auth/debug-sessions
 * @desc Debug endpoint to check sessions for a user
 * @access Private (development only)
 */
router.get('/debug-sessions', authenticate, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ message: 'Not found' });
    return;
  }
  try {
    const Session = (await import('@/infrastructure/database/mongoose/models/iam/users/session.model.js')).default as any;
    const userId = (req as any).user?._id;

    const allSessions = await Session.find({ userId }).lean();
    const activeSessions = await Session.find({
      userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() }
    }).lean();

    res.json({
      userId: userId?.toString(),
      totalSessions: allSessions.length,
      activeSessions: activeSessions.length,
      sessions: allSessions.map((s: any) => ({
        _id: s._id,
        isRevoked: s.isRevoked,
        expiresAt: s.expiresAt,
        lastActive: s.lastActive,
        createdAt: s.createdAt,
        tokenPrefix: s.refreshToken?.substring(0, 10) + '...',
        deviceType: s.deviceInfo?.type,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /auth/logout
 * @desc Logout a user
 * @access Public (but requires authentication to log audit)
 */
router.post('/logout', authenticate, csrfProtection, authController.logout);

/**
 * @route POST /auth/set-password
 * @desc Set password for OAuth users (enables email/password login)
 * @access Private
 */
router.post('/set-password', authenticate, setPasswordRateLimiter, csrfProtection, authController.setPassword);

/**
 * @route POST /auth/change-password
 * @desc Change password for authenticated user (requires current password)
 * @access Private
 */
router.post('/change-password', changePasswordRateLimiter, authenticate, csrfProtection, authController.changePassword);

/**
 * @route POST /auth/change-email
 * @desc Request email change (sends verification to new email)
 * @access Private
 */
router.post('/change-email', changeEmailRateLimiter, authenticate, csrfProtection, authController.changeEmail);

/**
 * @route POST /auth/verify-email-change
 * @desc Verify and complete email change
 * @access Public
 */
router.post('/verify-email-change', authController.verifyEmailChange);

/**
 * @route GET /auth/google
 * @desc Authenticate with Google
 * @access Public
 */
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false,
}));

/**
 * @route GET /auth/google/callback
 * @desc Google OAuth callback - uses controller that properly creates sessions
 * @access Public
 */
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=google-auth-failed`,
    session: false
  }),
  authController.googleCallback
);

export default router;
