import express from 'express';
import passport from 'passport';
import authController from '../../../controllers/auth/auth.controller';
import { authenticate, csrfProtection } from '../../../middleware/auth/auth';
import {
  loginRateLimiter,
  registrationRateLimiter,
  passwordResetRateLimiter,
  emailVerificationRateLimiter
} from '../../../middleware/system/rate-limiter.middleware';
import { generateAuthTokens } from '../../../../../core/application/services/auth/oauth.service';
import logger from '../../../../../shared/logger/winston.logger';

const router = express.Router();

/**
 * @route POST /auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', csrfProtection, registrationRateLimiter, authController.register);

/**
 * @route POST /auth/login
 * @desc Login a user
 * @access Public
 */
router.post('/login', loginRateLimiter, csrfProtection, authController.login);

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
router.post('/reset-password', csrfProtection, passwordResetRateLimiter, authController.requestPasswordReset);

/**
 * @route POST /auth/reset-password/confirm
 * @desc Reset password with token
 * @access Public
 */
router.post('/reset-password/confirm', csrfProtection, passwordResetRateLimiter, authController.resetPassword);

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
router.post('/resend-verification', csrfProtection, emailVerificationRateLimiter, authController.resendVerificationEmail);

/**
 * @route POST /auth/check-password-strength
 * @desc Check password strength
 * @access Public
 */
router.post('/check-password-strength', csrfProtection, authController.checkPasswordStrength);

/**
 * @route GET /auth/me
 * @desc Get current authenticated user
 * @access Private
 */
router.get('/me', authenticate, authController.getMe);

/**
 * @route POST /auth/logout
 * @desc Logout a user
 * @access Public (but requires authentication to log audit)
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route POST /auth/set-password
 * @desc Set password for OAuth users (enables email/password login)
 * @access Private
 */
router.post('/set-password', authenticate, authController.setPassword);

/**
 * @route POST /auth/change-password
 * @desc Change password for authenticated user (requires current password)
 * @access Private
 */
router.post('/change-password', authenticate, csrfProtection, authController.changePassword);

/**
 * @route POST /auth/change-email
 * @desc Request email change (sends verification to new email)
 * @access Private
 */
router.post('/change-email', authenticate, csrfProtection, authController.changeEmail);

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
 * @desc Google OAuth callback
 * @access Public
 */
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=google-auth-failed`,
    session: false
  }),
  (req, res) => {
    try {
      // Generate tokens
      const { accessToken, refreshToken } = generateAuthTokens(req.user as any);

      // Set both tokens as httpOnly cookies
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Redirect to frontend (cookies are already set)
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/oauth-callback`);
    } catch (error) {
      logger.error('Error in Google callback:', error);
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=google-auth-failed`);
    }
  }
);

export default router;
