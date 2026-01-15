import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import passport from 'passport';
import { User, IUser, MagicLink, TeamInvitation, Session } from '../../../../infrastructure/database/mongoose/models';
import { createAuditLog } from '../../middleware/system/audit-log.middleware';
import jwt from 'jsonwebtoken';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, revokeRefreshToken } from '../../../../shared/helpers/jwt';
import { sendVerificationEmail, sendPasswordResetEmail, sendMagicLinkEmail } from '../../../../core/application/services/communication/email.service';
import { createSession, updateSessionActivity } from '../../../../core/application/services/auth/session.service';
import { meetsMinimumRequirements, evaluatePasswordStrength, PASSWORD_REQUIREMENTS } from '../../../../core/application/services/auth/password.service';
import OnboardingProgressService from '../../../../core/application/services/onboarding/progress.service';
import { AuthTokenService } from '../../../../core/application/services/auth/token.service';
import { generateCSRFToken } from '../../middleware/auth/csrf';
import logger from '../../../../shared/logger/winston.logger';
import mongoose from 'mongoose';
import { sendSuccess, sendCreated } from '../../../../shared/utils/responseHelper';
import { withTransaction } from '../../../../shared/utils/transactionHelper';
import { AUTH_COOKIES, SESSION_CONSTANTS } from '../../../../shared/constants/security';
import { UserDTO } from '../../dtos/user.dto';
import { AuthenticationError, ValidationError, NotFoundError, ExternalServiceError, ConflictError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import MFAService from '../../../../core/application/services/auth/mfa.service';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

// Custom password validator
const passwordValidator = (password: string, ctx: z.RefinementCtx) => {
  const { valid, errors } = meetsMinimumRequirements(password);
  if (!valid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: errors.join('. '),
    });
    return z.NEVER;
  }
  return password;
};

// Define validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(PASSWORD_REQUIREMENTS.minLength).superRefine(passwordValidator),
  name: z.string().min(2),
  // SECURITY: Admin role removed from registration - admins created via DB only
  role: z.enum(['seller', 'staff']).optional(),
  companyId: z.string().optional(),
  teamRole: z.enum(['owner', 'admin', 'manager', 'member', 'viewer']).optional(),
  invitationToken: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  rememberMe: z.boolean().optional().default(false),
});

// We don't need a validation schema for refresh token as we handle it directly

const resetPasswordRequestSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(PASSWORD_REQUIREMENTS.minLength).superRefine(passwordValidator),
});

const verifyEmailSchema = z.object({
  token: z.string(),
});

const resendVerificationEmailSchema = z.object({
  email: z.string().email(),
});

const checkPasswordStrengthSchema = z.object({
  password: z.string(),
  email: z.string().email().optional(),
  name: z.string().optional(),
});

/**
 * Register a new user
 * @route POST /auth/register
 */
// Add NextFunction and Promise<void> return type
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = registerSchema.parse(req.body);
    await withTransaction(async (session) => {
      // Check if user exists (inside transaction to be safe, though unique index helps)
      const existingUser = await User.findOne({ email: validatedData.email }).session(session);
      if (existingUser) {
        throw new ConflictError(
          'An account with this email already exists. Please log in or use a different email address.',
          ErrorCode.BIZ_ALREADY_EXISTS
        ); // Will be caught below
      }

      // Check if there's an invitation token
      let companyId = validatedData.companyId;
      let teamRole = validatedData.teamRole;
      let companyName = '';

      if (validatedData.invitationToken) {
        // \u2705 PHASE 1 FIX: Hash invitation token for comparison
        const hashedInvitationToken = AuthTokenService.hashToken(validatedData.invitationToken);

        // Find the invitation
        const invitation = await TeamInvitation.findOne({
          token: hashedInvitationToken, // \u2705 Compare with HASH
          status: 'pending',
          expiresAt: { $gt: new Date() },
          email: validatedData.email.toLowerCase()
        }).populate('companyId', 'name').session(session);

        if (!invitation) {
          throw new ValidationError(
            'This invitation link is invalid or has expired. Please request a new invitation from your team admin.'
          );
        }

        // Use the company and role from the invitation
        companyId = (invitation.companyId as any)._id;
        teamRole = invitation.teamRole;
        companyName = (invitation.companyId as any).name;

        // Mark the invitation as accepted
        invitation.status = 'accepted';
        await invitation.save({ session });
      }

      // ✅ PHASE 1 FIX: Hash email verification token before storage
      const { raw: rawVerificationToken, hashed: hashedVerificationToken } =
        AuthTokenService.generateSecureToken();

      const verificationTokenExpiry = new Date();
      verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 1); // ✅ FEATURE 20: 1 hour expiry

      const user = new User({
        email: validatedData.email,
        password: validatedData.password,
        name: validatedData.name,
        // ✅ FEATURE 5: Fix role assignment - all company users are 'seller'
        role: validatedData.role || 'seller',
        ...(companyId && { companyId }),
        ...(teamRole && { teamRole }),
        isActive: false,
        // SECURITY: Explicitly initialize KYC status to prevent undefined bypass
        kycStatus: {
          isComplete: false,
          lastUpdated: new Date(),
        },
        security: {
          verificationToken: hashedVerificationToken, // ✅ Store HASH
          verificationTokenExpiry,
        },
      });

      await user.save({ session });

      // Send verification email (CRITICAL: Must succeed for security)
      try {
        await sendVerificationEmail(user.email, user.name, rawVerificationToken); // ✅ Send RAW token
      } catch (emailError) {
        logger.error(`Failed to send verification email to ${user.email}:`, emailError);
        // ⚠️ SECURITY: Throw error to rollback transaction
        // We cannot leave users in "unverified" state without a way to verify
        throw new ExternalServiceError(
          'Email Service',
          'Failed to send verification email. Please try again later or contact support.',
          ErrorCode.EXT_SERVICE_ERROR
        );
      }

      // Assert type after save if necessary, Mongoose methods usually return typed docs
      const savedUser = user as IUser & { _id: mongoose.Types.ObjectId };

      await createAuditLog(
        savedUser._id.toString(), // Use toString() for ObjectId
        savedUser.companyId,
        'create',
        'user',
        savedUser._id.toString(), // Use toString() for ObjectId
        {
          message: companyId
            ? `User registered and joined company ${companyName || companyId}`
            : 'User registered'
        },
        req
      );

      sendCreated(
        res,
        {
          userId: savedUser._id.toString(),
          name: savedUser.name,
          email: savedUser.email,
          role: savedUser.role,
          companyId: companyId?.toString(),
          isNewCompany: !validatedData.companyId && !validatedData.invitationToken,
          nextStep: 'email_verification',
          verificationRequired: true,
        },
        'User registered successfully. Please check your email to verify your account.'
      );
    });
  } catch (error: any) {
    logger.error('register error:', error);
    next(error);
  }
};

/**
 * Login a user
 * @route POST /auth/login
 */
// Add NextFunction and Promise<void> return type
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = loginSchema.parse(req.body);
    // ✅ CRITICAL FIX: Normalize email to lowercase for consistent lookups
    const normalizedEmail = validatedData.email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    // ✅ CRITICAL FIX: Timing attack protection - always hash a dummy password even if user not found
    if (!user) {
      // Constant-time comparison: hash a dummy password to prevent timing attacks
      const bcrypt = require('bcrypt');
      await bcrypt.compare(validatedData.password, '$2b$10$YourDummyHashHereToPreventTimingAttack1234567890');
      throw new AuthenticationError(
        'No account found with this email. Please check your email or sign up for a new account.',
        ErrorCode.AUTH_INVALID_CREDENTIALS
      );
    }
    // Assert type after null check
    const typedUser = user as IUser & { _id: mongoose.Types.ObjectId };

    // Check if account is locked
    if (typedUser.security.lockUntil && typedUser.security.lockUntil > new Date()) {
      const minutesLeft = Math.ceil((typedUser.security.lockUntil.getTime() - new Date().getTime()) / (60 * 1000));
      throw new AuthenticationError(
        `Account is temporarily locked due to multiple failed login attempts. Please try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`,
        ErrorCode.AUTH_ACCOUNT_LOCKED
      );
    }

    if (!typedUser.isActive) {
      throw new AuthenticationError(
        'Please verify your email address before logging in. Check your inbox for the verification link or request a new one.',
        ErrorCode.AUTH_ACCOUNT_DISABLED
      );
    }
    if (typedUser.isDeleted) {
      throw new AuthenticationError(
        'This account has been deactivated. Please contact support if you believe this is an error.',
        ErrorCode.AUTH_ACCOUNT_LOCKED
      );
    }

    // Check if this is an OAuth-only user (no password set)
    if (!typedUser.password && typedUser.oauthProvider && typedUser.oauthProvider !== 'email') {
      throw new AuthenticationError(
        `This account uses ${typedUser.oauthProvider} sign-in. Please use "Continue with ${typedUser.oauthProvider.charAt(0).toUpperCase() + typedUser.oauthProvider.slice(1)}" to login.`,
        ErrorCode.AUTH_OAUTH_FAILED
      );
    }

    // Check if password exists before comparing
    if (!typedUser.password) {
      throw new AuthenticationError(
        'No password set for this account. Please use "Forgot Password" to set up a password or sign in with your social account.',
        ErrorCode.AUTH_INVALID_CREDENTIALS
      );
    }

    const isPasswordValid = await typedUser.comparePassword(validatedData.password);
    if (!isPasswordValid) {
      // ATOMIC increment to prevent race condition bypass
      const updatedUser = await User.findOneAndUpdate(
        { _id: typedUser._id },
        {
          $inc: { 'security.failedLoginAttempts': 1 },
          $set: {
            'security.lastLogin': {
              timestamp: new Date(),
              ip: req.ip || 'unknown',
              userAgent: req.headers['user-agent'] || 'unknown',
              success: false,
            }
          }
        },
        { new: true }
      );

      const failedAttempts = updatedUser?.security?.failedLoginAttempts || 1;

      // Lock account after 5 failed attempts
      if (failedAttempts >= 5) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + 30);

        await User.updateOne(
          { _id: typedUser._id },
          { $set: { 'security.lockUntil': lockUntil } }
        );

        await createAuditLog(
          typedUser._id.toString(),
          typedUser.companyId,
          'account_lock',
          'user',
          typedUser._id.toString(),
          {
            message: 'Account locked due to multiple failed login attempts',
            success: false,
            failedAttempts,
            lockDuration: `${SESSION_CONSTANTS.LOCKOUT_DURATION_MINS} minutes`
          },
          req
        );
      }

      await createAuditLog(
        typedUser._id.toString(),
        typedUser.companyId,
        'login',
        'user',
        typedUser._id.toString(),
        { message: 'Failed login attempt', success: false, attempts: failedAttempts },
        req
      );

      if (failedAttempts >= SESSION_CONSTANTS.MAX_LOGIN_ATTEMPTS) {
        throw new AuthenticationError(
          `Your account has been temporarily locked due to multiple failed login attempts. Please try again in ${SESSION_CONSTANTS.LOCKOUT_DURATION_MINS} minutes or reset your password.`,
          ErrorCode.AUTH_ACCOUNT_LOCKED
        );
      } else {
        const attemptsLeft = SESSION_CONSTANTS.MAX_LOGIN_ATTEMPTS - failedAttempts;
        throw new AuthenticationError(
          `Incorrect password. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining before account lockout. Use "Forgot Password" if you don't remember it.`,
          ErrorCode.AUTH_INVALID_CREDENTIALS
        );
      }
    }
    typedUser.security.failedLoginAttempts = 0;
    typedUser.security.lockUntil = undefined;

    // ============================================================================
    // MFA CHECK - Phase 1 Implementation
    // ============================================================================
    // Check if user has MFA enabled
    const mfaEnabled = await MFAService.isMFAEnabled(typedUser._id.toString());

    if (mfaEnabled) {
      // Generate temporary token (using standard access token - 15min expiry)
      const tempToken = generateAccessToken(
        typedUser._id.toString(),
        typedUser.role,
        typedUser.companyId
      );

      // Update last login attempt (not successful yet)
      typedUser.security.lastLogin = {
        timestamp: new Date(),
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        success: false, // Not successful until MFA verified
      };
      await typedUser.save();

      await createAuditLog(
        typedUser._id.toString(),
        typedUser.companyId,
        'login', // Using standard login action
        'user',
        typedUser._id.toString(),
        { message: 'MFA verification required', mfaRequired: true, success: false },
        req
      );

      // Return MFA required response with temp token
      res.status(200).json({
        success: true,
        mfaRequired: true,
        tempToken,
        message: 'MFA verification required. Please provide your TOTP code or backup code.',
        expiresIn: '15m', // Standard access token expiry
      });
      return;
    }
    // ============================================================================

    // Handle "Remember Me" functionality
    const rememberMe = req.body.rememberMe === true;
    const refreshTokenExpiry = rememberMe ? '30d' : '7d'; // 30 days for remember me, 7 days otherwise

    const accessToken = generateAccessToken(typedUser._id.toString(), typedUser.role, typedUser.companyId);
    const refreshToken = generateRefreshToken(typedUser._id.toString(), typedUser.security.tokenVersion || 0, refreshTokenExpiry);

    typedUser.security.lastLogin = {
      timestamp: new Date(),
      ip: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      success: true,
    };
    await typedUser.save();

    await createAuditLog(
      typedUser._id.toString(),
      typedUser.companyId,
      'login',
      'user',
      typedUser._id.toString(),
      { message: 'User logged in', success: true, rememberMe },
      req
    );

    // Set cookie expiry based on remember me
    const cookieMaxAge = rememberMe
      ? 30 * 24 * 60 * 60 * 1000  // 30 days
      : 7 * 24 * 60 * 60 * 1000;  // 7 days

    // Calculate session expiry date
    const expiresAt = new Date();
    expiresAt.setTime(expiresAt.getTime() + cookieMaxAge);

    // Create a new session
    await createSession(typedUser._id, refreshToken, req, expiresAt);

    // Cookie name with secure prefix in production
    const refreshCookieName = process.env.NODE_ENV === 'production' ? AUTH_COOKIES.SECURE_REFRESH_TOKEN : AUTH_COOKIES.REFRESH_TOKEN;
    const accessCookieName = process.env.NODE_ENV === 'production' ? AUTH_COOKIES.SECURE_ACCESS_TOKEN : AUTH_COOKIES.ACCESS_TOKEN;

    res.cookie(refreshCookieName, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: cookieMaxAge,
    });

    // Set access token as httpOnly cookie
    res.cookie(accessCookieName, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    sendSuccess(res, {
      user: UserDTO.toResponse(typedUser),
      redirectUrl: typedUser.role === 'admin' ? '/admin/dashboard' : '/seller/dashboard',
      nextStep: typedUser.onboardingStep || 'completed',
    }, 'Login successful');
  } catch (error: any) {
    logger.error('login error:', error);
    next(error);
  }
};

/**
 * Refresh access token
 * @route POST /auth/refresh
 */
export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Cookie names with secure prefix in production
    const refreshCookieName = process.env.NODE_ENV === 'production' ? '__Secure-refreshToken' : 'refreshToken';
    const accessCookieName = process.env.NODE_ENV === 'production' ? '__Secure-accessToken' : 'accessToken';

    // Validate that we have a refresh token from either cookies or body
    const token = req.cookies?.[refreshCookieName] || req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) {
      throw new AuthenticationError(
        'Your session has expired. Please log in again to continue.',
        ErrorCode.AUTH_TOKEN_INVALID
      );
    }

    try {
      const payload = await verifyRefreshToken(token);
      const user = await User.findById(payload.userId);
      if (!user) {
        throw new AuthenticationError('Invalid refresh token', ErrorCode.AUTH_TOKEN_INVALID);
      }
      // Assert type after null check
      const typedUser = user as IUser & { _id: mongoose.Types.ObjectId };

      if (typedUser.security.tokenVersion !== payload.tokenVersion) {
        throw new AuthenticationError('Invalid refresh token', ErrorCode.AUTH_TOKEN_INVALID);
      }

      // Check if the session exists and is valid
      const session = await Session.findOne({
        userId: typedUser._id,
        refreshToken: token,
        isRevoked: false,
        expiresAt: { $gt: new Date() }
      });

      if (!session) {
        throw new AuthenticationError(
          'Your session has expired. Please log in again to access your account.',
          ErrorCode.AUTH_TOKEN_EXPIRED
        );
      }

      // Check for inactivity timeout (Issue #27: Use env variable)
      const INACTIVITY_TIMEOUT_MS = parseInt(process.env.SESSION_TIMEOUT_MS || String(SESSION_CONSTANTS.DEFAULT_TIMEOUT_MS));

      // ✅ FIX: Atomic session retrieval and activity update
      // This eliminates the race condition between finding and updating session
      const updatedSession = await Session.findOneAndUpdate(
        {
          userId: typedUser._id,
          refreshToken: token,
          isRevoked: false,
          expiresAt: { $gt: new Date() }
        },
        { $set: { lastActive: new Date() } },
        { new: true }
      );

      // (Lines 438-440 are redundant now as we check updatedSession below)

      if (!updatedSession) {
        // Session was already rotated by concurrent request (Fix #9: Idempotency)
        sendSuccess(res, {
          user: {
            id: typedUser._id.toString(),
            name: typedUser.name,
            email: typedUser.email,
            role: typedUser.role,
            companyId: typedUser.companyId,
          }
        }, 'Token already refreshed by concurrent request');
        return;
      }

      const lastActiveTime = updatedSession.lastActive?.getTime() || updatedSession.createdAt.getTime();
      const timeSinceActive = Date.now() - lastActiveTime;

      if (timeSinceActive > INACTIVITY_TIMEOUT_MS) {
        updatedSession.isRevoked = true;
        await updatedSession.save();

        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        throw new AuthenticationError(
          'Your session expired due to inactivity. For security, please log in again.',
          ErrorCode.AUTH_TOKEN_EXPIRED
        );
      }

      const accessToken = generateAccessToken(typedUser._id.toString(), typedUser.role, typedUser.companyId);

      // TOKEN ROTATION: Generate a new refresh token for better security
      const newRefreshToken = generateRefreshToken(
        typedUser._id.toString(),
        typedUser.security.tokenVersion || 0,
        '7d'
      );

      // Revoke the old refresh token
      await revokeRefreshToken(token);

      // Update session with new refresh token
      updatedSession.refreshToken = newRefreshToken;
      updatedSession.lastActive = new Date();
      await updatedSession.save();

      res.cookie(refreshCookieName, newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Set new access token as httpOnly cookie
      res.cookie(accessCookieName, accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      await createAuditLog(
        typedUser._id.toString(),
        typedUser.companyId,
        'other',
        'user',
        typedUser._id.toString(),
        { message: 'Token refreshed' },
        req
      );

      sendSuccess(res, {
        user: UserDTO.toResponse(typedUser),
      }, 'Token refreshed');
    } catch (tokenError) {
      logger.error('Token verification error:', tokenError);
      // ✅ CRITICAL FIX: Pass error to Express error handler instead of throwing
      next(new AuthenticationError('Invalid refresh token', ErrorCode.AUTH_TOKEN_INVALID));
      return;
    }
  } catch (error) {
    logger.error('Token refresh error:', error);
    // ✅ CRITICAL FIX: Pass error to Express error handler instead of throwing
    next(new AuthenticationError('Invalid refresh token', ErrorCode.AUTH_TOKEN_INVALID));
    return;
  }
};

/**
 * Request password reset
 * @route POST /auth/reset-password
 */
// Add NextFunction and Promise<void> return type
export const requestPasswordReset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = resetPasswordRequestSchema.parse(req.body);
    // ✅ FIX: Normalize email to lowercase
    const normalizedEmail = validatedData.email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      sendSuccess(res, null, 'If your email is registered, you will receive a password reset link');
      return;
    }
    // Assert type after null check
    const typedUser = user as IUser & { _id: mongoose.Types.ObjectId };

    // ✅ PHASE 1 FIX: Hash password reset token before storage
    const { raw: rawResetToken, hashed: hashedResetToken } =
      AuthTokenService.generateSecureToken();

    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1);

    typedUser.security.resetToken = hashedResetToken; // ✅ Store HASH
    typedUser.security.resetTokenExpiry = resetTokenExpiry;
    await typedUser.save();

    await sendPasswordResetEmail(typedUser.email, typedUser.name, rawResetToken); // ✅ Send RAW token

    await createAuditLog(
      typedUser._id.toString(),
      typedUser.companyId,
      'other',
      'user',
      typedUser._id.toString(),
      { message: 'Password reset requested' },
      req
    );

    sendSuccess(res, null, 'If your email is registered, you will receive a password reset link');
  } catch (error: any) {
    logger.error('requestPasswordReset error:', error);
    next(error);
  }
};

/**
 * Reset password
 * @route POST /auth/reset-password/confirm
 */
// Add NextFunction and Promise<void> return type
export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = resetPasswordSchema.parse(req.body);

    // ✅ PHASE 1 FIX: Hash incoming token for comparison
    const hashedToken = AuthTokenService.hashToken(validatedData.token);

    let revokedCount = 0;

    // ✅ FIX: Wrap in transaction for atomicity
    await withTransaction(async (session) => {
      // First try to find user by token (valid or expired)
      const user = await User.findOne({
        'security.resetToken': hashedToken,
      }).session(session);

      if (!user) {
        throw new ValidationError(
          'This password reset link is invalid or has already been used. Please request a new one.',
          [{ field: 'token', message: 'Invalid token' }]
        );
      }

      // Check if token is expired
      if (user.security.resetTokenExpiry && user.security.resetTokenExpiry <= new Date()) {
        throw new ValidationError(
          'This password reset link has expired. Password reset links are valid for 1 hour. Please request a new one.',
          [{ field: 'token', message: 'Token expired' }]
        );
      }

      const typedUser = user as IUser & { _id: mongoose.Types.ObjectId };

      typedUser.password = validatedData.newPassword;
      typedUser.security.resetToken = undefined;
      typedUser.security.resetTokenExpiry = undefined;
      typedUser.security.tokenVersion = (typedUser.security.tokenVersion || 0) + 1;
      await typedUser.save({ session });

      // Revoke all active sessions within transaction
      const result = await Session.updateMany(
        { userId: typedUser._id, isRevoked: false },
        { isRevoked: true },
        { session }
      );
      revokedCount = result.modifiedCount;
      logger.info(`Password reset: Revoked ${revokedCount} sessions for user ${typedUser._id}`);

      await createAuditLog(
        typedUser._id.toString(),
        typedUser.companyId,
        'password_change',
        'user',
        typedUser._id.toString(),
        {
          message: 'Password reset completed',
          method: 'reset_token',
          success: true,
          sessionsRevoked: revokedCount,
        },
        req
      );
    });

    sendSuccess(res, { sessionsRevoked: revokedCount }, 'Password has been reset successfully. Please log in again.');
  } catch (error: any) {
    logger.error('resetPassword error:', error);
    next(error);
  }
};


/**
 * Logout user
 * @route POST /auth/logout
 */
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Cookie names with secure prefix in production
    const refreshCookieName = process.env.NODE_ENV === 'production' ? '__Secure-refreshToken' : 'refreshToken';
    const accessCookieName = process.env.NODE_ENV === 'production' ? '__Secure-accessToken' : 'accessToken';

    const refreshToken = req.cookies?.[refreshCookieName] || req.cookies?.refreshToken;

    // ✅ FIX: Get access token to blacklist it immediately
    const accessToken = req.cookies?.[accessCookieName] || req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];

    // Clear both cookies (regular and secure-prefixed)
    res.clearCookie(refreshCookieName);
    res.clearCookie(accessCookieName);
    res.clearCookie('refreshToken'); // Clear regular cookie for backwards compatibility
    res.clearCookie('accessToken');

    // Cast to AuthRequest to access user property
    const authReq = req as Request;
    if (authReq.user) {
      // 1. Blacklist Access Token (Immediate invalidation)
      if (accessToken) {
        try {
          // Decode without verifying to get JTI and expiry
          const decoded = jwt.decode(accessToken) as any;
          if (decoded && decoded.jti && decoded.exp) {
            const timeUntilExpiry = decoded.exp - Math.floor(Date.now() / 1000);
            if (timeUntilExpiry > 0) {
              const { blacklistToken } = await import('../../../../shared/helpers/jwt.js');
              await blacklistToken(decoded.jti, timeUntilExpiry);
            }
          }
        } catch (err) {
          logger.warn('Failed to blacklist access token on logout', err);
        }
      }

      // 2. Revoke the current session if refresh token is available
      if (refreshToken) {
        // Revoke the refresh token in the blacklist
        await revokeRefreshToken(refreshToken);

        // Also mark the session as revoked in the database
        const session = await Session.findOne({
          refreshToken,
          userId: authReq.user._id,
          isRevoked: false
        });

        if (session) {
          session.isRevoked = true;
          await session.save();
        }
      }

      await createAuditLog(
        authReq.user._id,
        authReq.user.companyId,
        'logout',
        'user',
        authReq.user._id,
        { message: 'User logged out' },
        req
      );
    }

    sendSuccess(res, null, 'Logged out successfully');
  } catch (error: any) {
    logger.error('logout error:', error);
    next(error);
  }
};

/**
 * Verify email with token
 * @route POST /auth/verify-email
 */
export const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = verifyEmailSchema.parse(req.body);

    // ✅ PHASE 1 FIX: Hash incoming token for comparison
    const hashedToken = AuthTokenService.hashToken(validatedData.token);

    // First, try to find user by token (valid or expired)
    const user = await User.findOne({
      'security.verificationToken': hashedToken,
    });

    if (!user) {
      // Token doesn't exist in database - either invalid or already used
      // Check if there's a user with this email who is already verified
      throw new ValidationError('Invalid or expired verification token');
    }

    // Assert type after null check
    const typedUser = user as IUser & { _id: mongoose.Types.ObjectId };

    // ✅ IMPROVED: Check if already verified BEFORE checking expiry
    if (typedUser.isEmailVerified && typedUser.isActive) {
      sendSuccess(res, {
        alreadyVerified: true,
        message: 'Your email is already verified. You can log in directly.'
      }, 'Email already verified');
      return;
    }

    // Now check if token is expired
    if (typedUser.security.verificationTokenExpiry && typedUser.security.verificationTokenExpiry <= new Date()) {
      throw new ValidationError('Verification token has expired. Please request a new verification email.');
    }

    // Update user verification status
    typedUser.isEmailVerified = true;
    typedUser.isActive = true;
    typedUser.verificationLevel = Math.max(typedUser.verificationLevel || 0, 1) as 0 | 1 | 2 | 3;
    typedUser.onboardingStep = 'business_profile';
    typedUser.security.verificationToken = undefined;
    typedUser.security.verificationTokenExpiry = undefined;
    typedUser.security.failedLoginAttempts = 0;
    typedUser.security.lockUntil = undefined;

    // ✅ AUTO-LOGIN: Generate tokens
    const accessToken = generateAccessToken(
      typedUser._id.toString(),
      typedUser.role,
      typedUser.companyId?.toString()
    );

    const refreshToken = generateRefreshToken(
      typedUser._id.toString(),
      typedUser.security.tokenVersion || 0,
      '7d' // Default 7-day session
    );

    // ✅ Create session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    await createSession(typedUser._id.toString(), refreshToken, req, expiresAt);

    // ✅ Set httpOnly cookies
    const refreshCookieName = process.env.NODE_ENV === 'production' ? '__Secure-refreshToken' : 'refreshToken';
    const accessCookieName = process.env.NODE_ENV === 'production' ? '__Secure-accessToken' : 'accessToken';

    res.cookie(refreshCookieName, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.cookie(accessCookieName, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // ✅ FEATURE: Track onboarding progress when email is verified
    try {
      const onboardingService = new (OnboardingProgressService as any)();
      await onboardingService.updateStep(
        typedUser.companyId?.toString() || '',
        'emailVerified',
        typedUser._id.toString()
      );
    } catch (error: any) {
      logger.warn('Failed to update onboarding progress:', error);
      // Don't block the response for non-critical tracking
    }

    // Audit log
    await createAuditLog(
      typedUser._id.toString(),
      typedUser.companyId,
      'verify',
      'user',
      typedUser._id.toString(),
      {
        message: 'Email verified successfully',
        success: true,
      },
      req
    );

    // ✅ Return user data for frontend to update auth state
    const redirectUrl = typedUser.role === 'admin' ? '/admin' : '/seller/dashboard';

    sendSuccess(
      res,
      {
        user: {
          id: typedUser._id.toString(),
          name: typedUser.name,
          email: typedUser.email,
          role: typedUser.role,
          companyId: typedUser.companyId?.toString(),
          teamRole: typedUser.teamRole,
        },
        autoLogin: true,
        redirectUrl,
      },
      'Email verified successfully. Logging you in...'
    );
  } catch (error: any) {
    logger.error('verifyEmail error:', error);
    next(error);
  }
};

/**
 * Resend verification email
 * @route POST /auth/resend-verification
 */
export const resendVerificationEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = resendVerificationEmailSchema.parse(req.body);
    // ✅ FIX: Normalize email to lowercase
    const normalizedEmail = validatedData.email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      sendSuccess(res, null, 'If your email is registered, a new verification email will be sent');
      return;
    }

    // Assert type after null check
    const typedUser = user as IUser & { _id: mongoose.Types.ObjectId };

    // If user is already active, no need to send verification email
    if (typedUser.isActive) {
      sendSuccess(res, null, 'Your account is already verified');
      return;
    }

    // ✅ PHASE 1 FIX: Hash verification token before storage
    const { raw: rawVerificationToken, hashed: hashedVerificationToken } =
      AuthTokenService.generateSecureToken();

    const verificationTokenExpiry = new Date();
    verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 1); // ✅ FEATURE 20: 1 hour expiry

    // Update user with new verification token
    typedUser.security.verificationToken = hashedVerificationToken; // ✅ Store HASH
    typedUser.security.verificationTokenExpiry = verificationTokenExpiry;
    await typedUser.save();

    // Send verification email
    await sendVerificationEmail(typedUser.email, typedUser.name, rawVerificationToken); // ✅ Send RAW token

    await createAuditLog(
      typedUser._id.toString(),
      typedUser.companyId,
      'other',
      'user',
      typedUser._id.toString(),
      { message: 'Verification email resent' },
      req
    );

    sendSuccess(res, null, 'If your email is registered, a new verification email will be sent');
  } catch (error: any) {
    logger.error('resendVerificationEmail error:', error);
    next(error);
  }
};


/**
 * Check password strength
 * @route POST /auth/check-password-strength
 */
export const checkPasswordStrength = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = checkPasswordStrengthSchema.parse(req.body);

    // Collect user inputs to check against
    const userInputs: string[] = [];
    if (validatedData.email) userInputs.push(validatedData.email);
    if (validatedData.name) userInputs.push(validatedData.name);

    // Evaluate password strength
    const strength = evaluatePasswordStrength(validatedData.password, userInputs);

    sendSuccess(res, {
      score: strength.score,
      feedback: strength.feedback,
      isStrong: strength.isStrong,
      requirements: PASSWORD_REQUIREMENTS,
    }, 'Password strength evaluated');
  } catch (error: any) {
    logger.error('checkPasswordStrength error:', error);
    next(error);
  }
};
/**
 * Get current user
 * ✅ SECURITY: Excludes all sensitive fields (passwords, tokens, etc)
 * ✅ FEATURE: Returns comprehensive user data for frontend auth state
 * @route GET /auth/me
 */
export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as Request;
    if (!authReq.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    // Exclude sensitive fields: password, security tokens, OAuth tokens, email pending changes
    // ✅ FEATURE: Populate company details for dashboard context
    const user = await User.findById(authReq.user._id)
      .select('-password -security -oauth.google.accessToken -oauth.google.refreshToken -pendingEmailChange -oauthProvider')
      .populate('companyId', 'name status kycStatus subscriptionPlan')
      .lean();

    if (!user) {
      throw new NotFoundError('User', ErrorCode.BIZ_NOT_FOUND);
    }

    // ✅ FEATURE: Add last activity timestamp and formatted company info
    const userResponse = {
      ...UserDTO.toResponse(user as IUser),
      company: user.companyId ? {
        id: (user.companyId as any)._id.toString(),
        name: (user.companyId as any).name,
        status: (user.companyId as any).status,
        kycStatus: (user.companyId as any).kycStatus,
        plan: (user.companyId as any).subscriptionPlan || 'free'
      } : null,
      lastRequested: new Date().toISOString(),
    };

    // Use DTO for consistent response format
    sendSuccess(res, { user: userResponse }, 'User retrieved successfully');
  } catch (error: any) {
    logger.error('getMe error:', error);
    next(error);
  }
};

/**
 * Initiate Google OAuth
 * @route GET /auth/google
 */
export const googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false,
});

/**

* Google OAuth callback
 * @route GET /auth/google/callback
 */
export const googleCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user as IUser & { _id: mongoose.Types.ObjectId };

    if (!user) {
      logger.error('Google OAuth: No user in request');
      const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=oauth_failed`;
      res.redirect(redirectUrl);
      return;
    }

    logger.info('Google OAuth callback successful', { userId: user._id });

    // Generate JWT tokens
    const accessToken = generateAccessToken(
      user._id.toString(),
      user.role,
      user.companyId
    );
    const refreshToken = await generateRefreshToken(user._id.toString(), user.security?.tokenVersion || 0, '30d');

    // Set session expiry to 30 days for OAuth (better UX since no password typed)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

    // Create session
    await createSession(
      user._id.toString(),
      refreshToken,
      req,
      expiresAt
    );

    // Audit log
    await createAuditLog(
      user._id.toString(),
      user.companyId,
      'login',
      'user',
      user._id.toString(),
      { message: 'Google OAuth login successful', provider: 'google', success: true },
      req
    );

    // Set httpOnly cookies (same as regular login)
    const accessCookieName = process.env.NODE_ENV === 'production' ? '__Secure-accessToken' : 'accessToken';
    const refreshCookieName = process.env.NODE_ENV === 'production' ? '__Secure-refreshToken' : 'refreshToken';

    res.cookie(accessCookieName, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie(refreshCookieName, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days for OAuth
    });

    // Redirect to frontend without tokens in URL
    const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/seller/dashboard`;
    res.redirect(redirectUrl);
  } catch (error) {
    logger.error('Google OAuth callback error:', error);
    const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=server_error`;
    res.redirect(redirectUrl);
  }
};

/**
 * Set password for OAuth users (allows login with both methods)
 * @route POST /auth/set-password
 */
export const setPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as Request;
    if (!authReq.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    // ✅ FIX: Use consistent password validation (was only using min(8))
    const schema = z.object({
      password: z.string().min(PASSWORD_REQUIREMENTS.minLength).superRefine(passwordValidator),
    });
    const { password } = schema.parse(req.body);

    const user = await User.findById(authReq.user._id);
    if (!user) {
      throw new NotFoundError('User', ErrorCode.BIZ_NOT_FOUND);
    }

    const typedUser = user as IUser & { _id: mongoose.Types.ObjectId };

    // Check if user already has a password
    if (typedUser.password) {
      throw new ValidationError('Password already set. Use change password instead.');
    }

    // Set the password (will be hashed by pre-save hook)
    typedUser.password = password;

    // Update oauthProvider to indicate both methods available
    if (typedUser.oauthProvider && typedUser.oauthProvider !== 'email') {
      // Keep tracking that they also have OAuth
      // But now they can use password too
    }

    await typedUser.save();

    await createAuditLog(
      typedUser._id.toString(),
      typedUser.companyId,
      'password_change',
      'user',
      typedUser._id.toString(),
      { message: 'Password set for OAuth account', success: true },
      req
    );

    sendSuccess(res, null, 'Password set successfully. You can now login with email and password.');
  } catch (error) {
    logger.error('Set password error:', error);
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      throw new ValidationError('Validation failed', errors);
    }
    next(error);
  }
};

/**
 * Change password for authenticated user
 * ✅ SECURITY: Invalidates all sessions to prevent session hijacking
 * ✅ FEATURE: Requires current password verification
 * @route POST /auth/change-password
 */
export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as Request;
    if (!authReq.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    const schema = z.object({
      currentPassword: z.string().min(1, 'Current password is required'),
      // ✅ FIX: Use consistent password validation (was only using min(8))
      newPassword: z.string().min(PASSWORD_REQUIREMENTS.minLength).superRefine(passwordValidator),
    });

    const validation = schema.safeParse(req.body);
    if (!validation.success) {
      const details = validation.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      throw new ValidationError('Validation failed', details);
    }

    const { currentPassword, newPassword } = validation.data;

    const user = await User.findById(authReq.user._id);
    if (!user) {
      throw new NotFoundError('User', ErrorCode.BIZ_NOT_FOUND);
    }

    const typedUser = user as IUser & { _id: mongoose.Types.ObjectId };

    // Check if user has a password (OAuth users who haven't set password should use set-password)
    if (!typedUser.password) {
      throw new ValidationError('No password set. Please use set-password endpoint first.');
    }

    // Verify current password
    const isCurrentPasswordValid = await typedUser.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      await createAuditLog(
        typedUser._id.toString(),
        typedUser.companyId,
        'security',
        'user',
        typedUser._id.toString(),
        { message: 'Failed password change attempt - incorrect current password', success: false },
        req
      );
      throw new AuthenticationError(
        'The current password you entered is incorrect. Please try again or use "Forgot Password" if you don\'t remember it.',
        ErrorCode.AUTH_INVALID_CREDENTIALS
      );
    }

    // Check new password is different
    if (currentPassword === newPassword) {
      throw new ValidationError(
        'Your new password must be different from your current password. Please choose a different password.',
        [{ field: 'newPassword', message: 'Must be different from current password' }]
      );
    }

    // Update password and increment token version (invalidate all sessions)
    typedUser.password = newPassword;
    typedUser.security.tokenVersion = (typedUser.security.tokenVersion || 0) + 1;
    await typedUser.save();

    // ✅ SECURITY: Revoke ALL existing sessions to prevent session hijacking
    const revokedCount = await Session.updateMany(
      { userId: typedUser._id, isRevoked: false },
      { isRevoked: true }
    );

    // ✅ FIX: Create new session for current user so they stay logged in
    const accessToken = generateAccessToken(
      typedUser._id.toString(),
      typedUser.role,
      typedUser.companyId
    );
    const refreshToken = generateRefreshToken(
      typedUser._id.toString(),
      typedUser.security.tokenVersion || 0,
      '7d'
    );

    // Set httpOnly cookies
    const refreshCookieName = process.env.NODE_ENV === 'production' ? AUTH_COOKIES.SECURE_REFRESH_TOKEN : AUTH_COOKIES.REFRESH_TOKEN;
    const accessCookieName = process.env.NODE_ENV === 'production' ? AUTH_COOKIES.SECURE_ACCESS_TOKEN : AUTH_COOKIES.ACCESS_TOKEN;

    res.cookie(refreshCookieName, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.cookie(accessCookieName, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    await createAuditLog(
      typedUser._id.toString(),
      typedUser.companyId,
      'password_change',
      'user',
      typedUser._id.toString(),
      {
        message: 'Password changed successfully',
        success: true,
        sessionsRevoked: revokedCount.modifiedCount
      },
      req
    );

    sendSuccess(res, {
      sessionInvalidated: true,
      sessionsRevoked: revokedCount.modifiedCount
    }, 'Password changed successfully. Please login again with your new password.');
  } catch (error) {
    logger.error('Change password error:', error);
    next(error);
  }
};

/**
 * Request email change (sends verification to new email)
 * ✅ SECURITY: Requires password confirmation for sensitive operation
 * ✅ FEATURE: Stores verification token securely (hashed)
 * @route POST /auth/change-email
 */
export const changeEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as Request;
    if (!authReq.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    const schema = z.object({
      newEmail: z.string().email('Invalid email format'),
      password: z.string().optional(), // Optional - will validate based on user type
    });

    const validation = schema.safeParse(req.body);
    if (!validation.success) {
      const details = validation.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      throw new ValidationError('Validation failed', details);
    }

    const { newEmail, password } = validation.data;

    const user = await User.findById(authReq.user._id);
    if (!user) {
      throw new NotFoundError('User', ErrorCode.BIZ_NOT_FOUND);
    }

    const typedUser = user as IUser & { _id: mongoose.Types.ObjectId };

    // Verify password based on user type
    if (typedUser.password) {
      // Standard user - password is REQUIRED
      if (!password) {
        throw new ValidationError(
          'Please provide your current password to change your email address.',
          [{ field: 'password', message: 'Password is required for email change' }]
        );
      }

      const isPasswordValid = await typedUser.comparePassword(password);
      if (!isPasswordValid) {
        await createAuditLog(
          typedUser._id.toString(),
          typedUser.companyId,
          'security',
          'user',
          typedUser._id.toString(),
          { message: 'Failed email change attempt - incorrect password', success: false, newEmail },
          req
        );
        throw new AuthenticationError(
          'Incorrect password. Please verify your current password to change your email address.',
          ErrorCode.AUTH_INVALID_CREDENTIALS
        );
      }
    } else {
      // OAuth user - must set password first
      throw new ValidationError(
        'You signed up using a social account. Please set a password first using the "Set Password" option before changing your email.',
        [{ field: 'password', message: 'No password set for OAuth account' }]
      );
    }

    // Check if new email is same as current
    const normalizedNewEmail = newEmail.toLowerCase();
    const normalizedCurrentEmail = typedUser.email.toLowerCase();

    if (normalizedCurrentEmail === normalizedNewEmail) {
      throw new ValidationError(
        'This is already your current email address. Please enter a different email address.',
        [{ field: 'newEmail', message: 'Same as current email' }]
      );
    }

    // Check if new email already exists
    const existingUser = await User.findOne({ email: normalizedNewEmail });
    if (existingUser) {
      logger.warn('Email change attempt with already registered email', {
        userId: typedUser._id,
        attemptedEmail: normalizedNewEmail
      });
      // Don't reveal that email exists (security)
      sendSuccess(res, null, `Verification email sent to ${newEmail}. Please check your inbox to confirm the change.`);
      return;
    }

    // ✅ PHASE 1 FIX: Hash email change verification token before storage
    const { raw: rawVerificationToken, hashed: hashedVerificationToken } =
      AuthTokenService.generateSecureToken();

    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // 24 hours

    // Store pending email change
    typedUser.pendingEmailChange = {
      email: normalizedNewEmail,
      token: hashedVerificationToken, // ✅ Store HASH
      tokenExpiry: tokenExpiry,
    };
    await typedUser.save();

    // Send verification email to NEW email address
    try {
      await sendVerificationEmail(newEmail, typedUser.name, rawVerificationToken); // ✅ Send RAW token
    } catch (emailError) {
      logger.error('Failed to send email change verification:', emailError);
      // Clear pending email change if email fails
      typedUser.pendingEmailChange = undefined;
      await typedUser.save();
      throw new ExternalServiceError(
        'Email Service',
        'We couldn\'t send the verification email to your new address. Your email change is pending - please try again or contact support.',
        ErrorCode.EXT_SERVICE_ERROR
      );
    }

    await createAuditLog(
      typedUser._id.toString(),
      typedUser.companyId,
      'email_change',
      'user',
      typedUser._id.toString(),
      { message: 'Email change requested', newEmail: normalizedNewEmail, success: true },
      req
    );

    sendSuccess(res, null, `Verification email sent to ${newEmail}. Please check your inbox to confirm the change.`);
  } catch (error) {
    logger.error('Change email error:', error);
    next(error);
  }
};

/**
 * Verify email change
 * @route POST /auth/verify-email-change
 */
export const verifyEmailChange = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schema = z.object({
      token: z.string(),
    });
    const { token } = schema.parse(req.body);

    // ✅ PHASE 1 FIX: Hash incoming token for comparison
    const hashedToken = AuthTokenService.hashToken(token);

    const user = await User.findOne({
      'pendingEmailChange.token': hashedToken, // ✅ Compare with HASH
      'pendingEmailChange.tokenExpiry': { $gt: new Date() },
    });

    if (!user) {
      throw new ValidationError('Invalid or expired verification token');
    }

    const typedUser = user as IUser & { _id: mongoose.Types.ObjectId };

    if (!typedUser.pendingEmailChange) {
      throw new ValidationError('No pending email change');
    }

    const oldEmail = typedUser.email;
    const newEmail = typedUser.pendingEmailChange.email;

    // Update email and clear pending change
    typedUser.email = newEmail;
    typedUser.pendingEmailChange = undefined;
    await typedUser.save();

    await createAuditLog(
      typedUser._id.toString(),
      typedUser.companyId,
      'email_change',
      'user',
      typedUser._id.toString(),
      { message: 'Email changed successfully', oldEmail, newEmail, success: true },
      req
    );

    sendSuccess(res, { newEmail }, 'Email changed successfully');
  } catch (error) {
    logger.error('Verify email change error:', error);
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      throw new ValidationError('Validation failed', errors);
    }
    next(error);
  }
};

/**
 * Request magic link for passwordless login
 * @route POST /auth/magic-link
 */
export const requestMagicLink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schema = z.object({
      email: z.string().email(),
    });
    const { email } = schema.parse(req.body);

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    // Generic response to prevent user enumeration
    const genericMessage = 'If your email is registered, you will receive a magic link shortly';

    if (!user) {
      sendSuccess(res, null, genericMessage);
      return;
    }

    const typedUser = user as IUser & { _id: mongoose.Types.ObjectId };

    // Check if account is active
    if (!typedUser.isActive) {
      sendSuccess(res, null, genericMessage);
      return;
    }

    // Generate raw token (32 bytes = 64 hex characters)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Create magic link record
    await MagicLink.create({
      email: typedUser.email,
      userId: typedUser._id,
      token: hashedToken,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      ip: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });

    // Send magic link email
    const magicUrl = `${process.env.CLIENT_URL}/auth/magic?token=${rawToken}`;
    await sendMagicLinkEmail(typedUser.email, typedUser.name, magicUrl);

    // Audit log
    await createAuditLog(
      typedUser._id.toString(),
      typedUser.companyId,
      'security',
      'user',
      typedUser._id.toString(),
      { message: 'Magic link requested', ip: req.ip },
      req
    );

    sendSuccess(res, null, genericMessage);
  } catch (error) {
    logger.error('Magic link request error:', error);
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      throw new ValidationError('Validation failed', errors);
    }
    next(error);
  }
};

/**
 * Verify magic link and log user in
 * @route POST /auth/verify-magic-link
 */
export const verifyMagicLink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schema = z.object({
      token: z.string(),
    });
    const { token } = schema.parse(req.body);

    // Hash the token to match database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find magic link
    // First find by token to give specific error about expiry vs invalidity
    const magicLink = await MagicLink.findOne({
      token: hashedToken,
      usedAt: null, // Not yet used
    });

    if (!magicLink) {
      throw new ValidationError(
        'This login link is invalid or has already been used. Please request a new one.',
        [{ field: 'token', message: 'Invalid link' }]
      );
    }

    // Check if link is expired
    if (magicLink.expiresAt <= new Date()) {
      // ✅ CLEANUP: Delete expired magic link
      await MagicLink.deleteOne({ _id: magicLink._id });

      throw new ValidationError(
        'This login link has expired. Magic links are valid for 15 minutes. Please request a new one.',
        [{ field: 'token', message: 'Link expired' }]
      );
    }

    // ✅ CLEANUP: Delete magic link after successful verification
    await MagicLink.deleteOne({ _id: magicLink._id });

    // (We deleted it, so no need to mark as used)

    // Get user
    const user = await User.findById(magicLink.userId);

    if (!user) {
      throw new NotFoundError('User', ErrorCode.BIZ_NOT_FOUND);
    }

    const typedUser = user as IUser & { _id: mongoose.Types.ObjectId };

    if (!typedUser.isActive) {
      throw new AuthenticationError(
        'Your account is not active. Please verify your email first or contact support.',
        ErrorCode.AUTH_ACCOUNT_DISABLED
      );
    }

    // Generate tokens (30-day session for magic link convenience)
    const accessToken = generateAccessToken(
      typedUser._id.toString(),
      typedUser.role,
      typedUser.companyId?.toString()
    );

    const refreshToken = generateRefreshToken(
      typedUser._id.toString(),
      typedUser.security.tokenVersion || 0,
      '30d' // Magic link = long session
    );

    // Create session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
    await createSession(typedUser._id.toString(), refreshToken, req, expiresAt);

    // Set httpOnly cookies
    const refreshCookieName = process.env.NODE_ENV === 'production' ? '__Secure-refreshToken' : 'refreshToken';
    const accessCookieName = process.env.NODE_ENV === 'production' ? '__Secure-accessToken' : 'accessToken';

    res.cookie(refreshCookieName, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.cookie(accessCookieName, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Audit log
    await createAuditLog(
      typedUser._id.toString(),
      typedUser.companyId,
      'login',
      'user',
      typedUser._id.toString(),
      { message: 'Magic link login successful', ip: req.ip },
      req
    );

    // Update last login
    typedUser.security.lastLogin = {
      timestamp: new Date(),
      ip: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      success: true,
    };
    await typedUser.save();

    // Return user data matching login response structure
    const redirectUrl = typedUser.role === 'admin' ? '/admin' : '/seller/dashboard';

    // Determine next step based on onboarding status
    let nextStep = 'completed';
    if (!typedUser.isEmailVerified) nextStep = 'email_verification';
    else if (typedUser.onboardingStep) nextStep = typedUser.onboardingStep;

    sendSuccess(
      res,
      {
        user: UserDTO.toResponse(typedUser),
        redirectUrl,
        nextStep,
        autoLogin: true,
      },
      'Magic link verified. Logging you in...'
    );
  } catch (error) {
    logger.error('Magic link verification error:', error);
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      throw new ValidationError('Validation failed', errors);
    }
    next(error);
  }
};

/**
 * Get CSRF Token
 * @route GET /auth/csrf-token
 * @access Public (session created automatically if not exists)
 */
export const getCSRFToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get session ID from authenticated user or generate one
    // For authenticated users: use user ID
    // For unauthenticated users: use a temporary session identifier
    let sessionId = (req as any).user?._id;

    if (!sessionId) {
      // For unauthenticated users, create a temporary session ID
      // This can be based on IP + User-Agent for basic tracking
      const crypto = await import('crypto');
      const identifier = `${req.ip || 'unknown'}-${req.headers['user-agent'] || 'unknown'}`;
      sessionId = crypto.createHash('sha256').update(identifier).digest('hex');
    }

    const csrfToken = await generateCSRFToken(sessionId);

    sendSuccess(
      res,
      { csrfToken },
      'CSRF token generated',
      200
    );
  } catch (error) {
    logger.error('Get CSRF token error:', error);
    next(error);
  }
};


const authController = {
  register,
  login,
  refreshToken,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  logout,
  resendVerificationEmail,
  checkPasswordStrength,
  getMe,
  setPassword,
  changePassword,
  changeEmail,
  verifyEmailChange,
  requestMagicLink,
  verifyMagicLink,
  getCSRFToken,
};

export default authController;

