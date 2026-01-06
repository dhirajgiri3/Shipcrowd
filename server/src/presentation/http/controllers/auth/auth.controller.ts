import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import passport from 'passport';
import { User, IUser } from '../../../../infrastructure/database/mongoose/models';
import { TeamInvitation } from '../../../../infrastructure/database/mongoose/models';
import { Session } from '../../../../infrastructure/database/mongoose/models';
import { createAuditLog } from '../../middleware/system/audit-log.middleware';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, revokeRefreshToken } from '../../../../shared/helpers/jwt';
import { sendVerificationEmail, sendPasswordResetEmail, sendMagicLinkEmail } from '../../../../core/application/services/communication/email.service';
import { createSession, updateSessionActivity, revokeSession, getUserSessions, revokeAllSessions } from '../../../../core/application/services/auth/session.service';
import { meetsMinimumRequirements, evaluatePasswordStrength, PASSWORD_REQUIREMENTS } from '../../../../core/application/services/auth/password.service';
import { formatError } from '../../../../shared/errors/error-messages';
import logger from '../../../../shared/logger/winston.logger';
import { AuthRequest } from '../../middleware/auth/auth';
import mongoose from 'mongoose';
import { sendSuccess, sendError, sendValidationError, sendCreated } from '../../../../shared/utils/responseHelper';

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
  role: z.enum(['admin', 'seller', 'staff']).optional(),
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
  password: z.string().min(PASSWORD_REQUIREMENTS.minLength).superRefine(passwordValidator),
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
    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) {
      sendError(res, 'User already exists', 409, 'USER_EXISTS');
      return;
    }

    // Check if there's an invitation token
    let companyId = validatedData.companyId;
    let teamRole = validatedData.teamRole;
    let companyName = '';

    if (validatedData.invitationToken) {
      // Find the invitation
      const invitation = await TeamInvitation.findOne({
        token: validatedData.invitationToken,
        status: 'pending',
        expiresAt: { $gt: new Date() },
        email: validatedData.email.toLowerCase()
      }).populate('companyId', 'name');

      if (!invitation) {
        sendError(res, 'Invalid or expired invitation token', 400, 'INVALID_INVITATION');
        return;
      }

      // Use the company and role from the invitation
      companyId = (invitation.companyId as any)._id;
      teamRole = invitation.teamRole;
      companyName = (invitation.companyId as any).name;

      // Mark the invitation as accepted
      invitation.status = 'accepted';
      await invitation.save();
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date();
    verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 24);

    const user = new User({
      email: validatedData.email,
      password: validatedData.password,
      name: validatedData.name,
      // ✅ FEATURE 5: Fix role assignment - all company users are 'seller'
      role: validatedData.role || 'seller', // Changed from (teamRole ? 'staff' : 'seller')
      ...(companyId && { companyId }),
      ...(teamRole && { teamRole }),
      isActive: false,
      security: {
        verificationToken,
        verificationTokenExpiry,
      },
    });

    await user.save();

    // ✅ FEATURE 6: Auto-create company for first user and assign as owner
    if (!companyId) {
      const { Company } = await import('../../../../infrastructure/database/mongoose/models/index.js');
      const newCompany = new Company({
        name: `${user.name}'s Company`,
        owner: user._id,
        status: 'pending_verification',
        settings: {
          currency: 'INR',
          timezone: 'Asia/Kolkata',
        },
      });
      await newCompany.save();

      // Update user with company and owner role
      user.companyId = newCompany._id;
      user.teamRole = 'owner';
      await user.save();

      logger.info(`Auto-created company ${newCompany._id} for user ${user._id}`);
    }

    await sendVerificationEmail(user.email, user.name, verificationToken);

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
      { companyId: companyId?.toString() },
      'User registered successfully. Please check your email to verify your account.'
    );
  } catch (error) {
    logger.error('Registration error:', error);
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      sendValidationError(res, errors);
      return;
    }
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
    const user = await User.findOne({ email: validatedData.email });

    if (!user) {
      sendError(res, 'Invalid credentials', 401, 'INVALID_CREDENTIALS');
      return;
    }
    // Assert type after null check
    const typedUser = user as IUser & { _id: mongoose.Types.ObjectId };

    // Check if account is locked
    if (typedUser.security.lockUntil && typedUser.security.lockUntil > new Date()) {
      const minutesLeft = Math.ceil((typedUser.security.lockUntil.getTime() - new Date().getTime()) / (60 * 1000));
      sendError(
        res,
        `Account is temporarily locked due to multiple failed login attempts. Please try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`,
        401,
        'ACCOUNT_LOCKED'
      );
      return;
    }

    if (!typedUser.isActive) {
      sendError(res, 'Account is not active. Please verify your email.', 401, 'ACCOUNT_INACTIVE');
      return;
    }
    if (typedUser.isDeleted) {
      sendError(res, 'Account has been deleted', 401, 'ACCOUNT_DELETED');
      return;
    }

    // Check if this is an OAuth-only user (no password set)
    if (!typedUser.password && typedUser.oauthProvider && typedUser.oauthProvider !== 'email') {
      sendError(
        res,
        `This account uses ${typedUser.oauthProvider} sign-in. Please use "Continue with ${typedUser.oauthProvider.charAt(0).toUpperCase() + typedUser.oauthProvider.slice(1)}" to login.`,
        401,
        'OAUTH_ACCOUNT'
      );
      return;
    }

    // Check if password exists before comparing
    if (!typedUser.password) {
      sendError(res, 'Invalid credentials', 401, 'INVALID_CREDENTIALS');
      return;
    }

    const isPasswordValid = await typedUser.comparePassword(validatedData.password);
    if (!isPasswordValid) {
      // Increment failed login attempts
      typedUser.security.failedLoginAttempts = (typedUser.security.failedLoginAttempts || 0) + 1;

      // Lock account after 5 failed attempts
      if (typedUser.security.failedLoginAttempts >= 5) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + 30); // Lock for 30 minutes
        typedUser.security.lockUntil = lockUntil;

        await createAuditLog(
          typedUser._id.toString(),
          typedUser.companyId,
          'account_lock',
          'user',
          typedUser._id.toString(),
          {
            message: 'Account locked due to multiple failed login attempts',
            success: false,
            failedAttempts: typedUser.security.failedLoginAttempts,
            lockDuration: '30 minutes'
          },
          req
        );
      }

      typedUser.security.lastLogin = {
        timestamp: new Date(),
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        success: false,
      };
      await typedUser.save();

      await createAuditLog(
        typedUser._id.toString(),
        typedUser.companyId,
        'login',
        'user',
        typedUser._id.toString(),
        { message: 'Failed login attempt', success: false, attempts: typedUser.security.failedLoginAttempts },
        req
      );

      if (typedUser.security.failedLoginAttempts >= 5) {
        sendError(
          res,
          'Account is temporarily locked due to multiple failed login attempts. Please try again in 30 minutes.',
          401,
          'ACCOUNT_LOCKED'
        );
      } else {
        sendError(
          res,
          'Invalid credentials',
          401,
          'INVALID_CREDENTIALS'
        );
      }
      return;
    }

    // Reset failed login attempts on successful login
    typedUser.security.failedLoginAttempts = 0;
    typedUser.security.lockUntil = undefined;

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
    const refreshCookieName = process.env.NODE_ENV === 'production' ? '__Secure-refreshToken' : 'refreshToken';
    const accessCookieName = process.env.NODE_ENV === 'production' ? '__Secure-accessToken' : 'accessToken';

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
      user: {
        id: typedUser._id.toString(),
        name: typedUser.name,
        email: typedUser.email,
        role: typedUser.role,
        companyId: typedUser.companyId,
      },
    }, 'Login successful');
  } catch (error) {
    logger.error('Login error:', error);
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      sendValidationError(res, errors);
      return;
    }
    next(error);
  }
};

/**
 * Refresh access token
 * @route POST /auth/refresh
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    // Cookie names with secure prefix in production
    const refreshCookieName = process.env.NODE_ENV === 'production' ? '__Secure-refreshToken' : 'refreshToken';
    const accessCookieName = process.env.NODE_ENV === 'production' ? '__Secure-accessToken' : 'accessToken';

    // Validate that we have a refresh token from either cookies or body
    const token = req.cookies?.[refreshCookieName] || req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) {
      sendError(res, 'Refresh token is required', 401, 'REFRESH_TOKEN_REQUIRED');
      return;
    }

    try {
      const payload = await verifyRefreshToken(token);
      const user = await User.findById(payload.userId);
      if (!user) {
        sendError(res, 'Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
        return;
      }
      // Assert type after null check
      const typedUser = user as IUser & { _id: mongoose.Types.ObjectId };

      if (typedUser.security.tokenVersion !== payload.tokenVersion) {
        sendError(res, 'Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
        return;
      }

      // Check if the session exists and is valid
      const session = await Session.findOne({
        userId: typedUser._id,
        refreshToken: token,
        isRevoked: false,
        expiresAt: { $gt: new Date() }
      });

      if (!session) {
        sendError(res, 'Session expired or invalid', 401, 'SESSION_EXPIRED');
        return;
      }

      // Check for inactivity timeout (Issue #27: Use env variable)
      const INACTIVITY_TIMEOUT_MS = parseInt(process.env.SESSION_TIMEOUT_MS || String(8 * 60 * 60 * 1000)); // Default 8 hours

      // Update session activity BEFORE timeout check (Fix #5)
      await updateSessionActivity(token);

      // Re-fetch session after activity update
      const updatedSession = await Session.findOne({
        userId: typedUser._id,
        refreshToken: token,
        isRevoked: false,
        expiresAt: { $gt: new Date() }
      });

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
        }, 'Token already refreshed');
        return;
      }

      const lastActiveTime = updatedSession.lastActive?.getTime() || updatedSession.createdAt.getTime();
      const timeSinceActive = Date.now() - lastActiveTime;

      if (timeSinceActive > INACTIVITY_TIMEOUT_MS) {
        updatedSession.isRevoked = true;
        await updatedSession.save();

        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        sendError(res, 'Session expired due to inactivity', 401, 'SESSION_TIMEOUT');
        return;
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
        user: {
          id: typedUser._id.toString(),
          name: typedUser.name,
          email: typedUser.email,
          role: typedUser.role,
          companyId: typedUser.companyId,
        }
      }, 'Token refreshed');
    } catch (tokenError) {
      logger.error('Token verification error:', tokenError);
      sendError(res, 'Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }
  } catch (error) {
    logger.error('Token refresh error:', error);
    sendError(res, 'Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
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
    const user = await User.findOne({ email: validatedData.email });
    if (!user) {
      sendSuccess(res, null, 'If your email is registered, you will receive a password reset link');
      return;
    }
    // Assert type after null check
    const typedUser = user as IUser & { _id: mongoose.Types.ObjectId };

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1);

    typedUser.security.resetToken = resetToken;
    typedUser.security.resetTokenExpiry = resetTokenExpiry;
    await typedUser.save();

    await sendPasswordResetEmail(typedUser.email, typedUser.name, resetToken);

    await createAuditLog(
      typedUser._id.toString(),
      typedUser.companyId,
      'other',
      'user',
      typedUser._id.toString(),
      { message: 'Password reset requested' },
      req
    );

    res.json({ message: 'If your email is registered, you will receive a password reset link' });
  } catch (error) {
    logger.error('Password reset request error:', error);
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      sendValidationError(res, errors);
      return;
    }
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
    const user = await User.findOne({
      'security.resetToken': validatedData.token,
      'security.resetTokenExpiry': { $gt: new Date() },
    });

    if (!user) {
      sendError(res, 'Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');
      return;
    }
    // Assert type after null check
    const typedUser = user as IUser & { _id: mongoose.Types.ObjectId };

    typedUser.password = validatedData.password;
    typedUser.security.resetToken = undefined;
    typedUser.security.resetTokenExpiry = undefined;
    typedUser.security.tokenVersion = (typedUser.security.tokenVersion || 0) + 1;
    await typedUser.save();

    // ✅ FEATURE 12: Password Reset Auto-Logout
    // Revoke all active sessions to force re-login everywhere
    const revokedCount = await revokeAllSessions(typedUser._id.toString());
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

    sendSuccess(res, { sessionsRevoked: revokedCount }, 'Password has been reset successfully. Please log in again.');
  } catch (error) {
    logger.error('Password reset error:', error);
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      sendValidationError(res, errors);
      return;
    }
    next(error);
  }
};

/**
 * Verify email
 * @route POST /auth/verify-email
 */
// Add NextFunction and Promise<void> return type
export const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = verifyEmailSchema.parse(req.body);
    const user = await User.findOne({
      'security.verificationToken': validatedData.token,
      'security.verificationTokenExpiry': { $gt: new Date() },
    });

    if (!user) {
      sendError(res, 'Invalid or expired verification token', 400, 'INVALID_VERIFICATION_TOKEN');
      return;
    }
    // Assert type after null check
    const typedUser = user as IUser & { _id: mongoose.Types.ObjectId };

    // Mark user as verified and active
    typedUser.isActive = true;
    typedUser.isEmailVerified = true;
    typedUser.security.verificationToken = undefined;
    typedUser.security.verificationTokenExpiry = undefined;
    await typedUser.save();

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

    // Audit log
    await createAuditLog(
      typedUser._id.toString(),
      typedUser.companyId,
      'verify', // Changed from 'email_verified_auto_login' to valid action type
      'user',
      typedUser._id.toString(),
      { message: 'Email verified and auto-logged in' },
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
  } catch (error) {
    logger.error('Email verification error:', error);
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      sendValidationError(res, errors);
      return;
    }
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

    // Clear both cookies (regular and secure-prefixed)
    res.clearCookie(refreshCookieName);
    res.clearCookie(accessCookieName);
    res.clearCookie('refreshToken'); // Clear regular cookie for backwards compatibility
    res.clearCookie('accessToken');

    // Cast to AuthRequest to access user property
    const authReq = req as AuthRequest;
    if (authReq.user) {
      // Revoke the current session if refresh token is available
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
  } catch (error) {
    logger.error('Logout error:', error);
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
    const user = await User.findOne({ email: validatedData.email });

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

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date();
    verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 24);

    // Update user with new verification token
    typedUser.security.verificationToken = verificationToken;
    typedUser.security.verificationTokenExpiry = verificationTokenExpiry;
    await typedUser.save();

    // Send verification email
    await sendVerificationEmail(typedUser.email, typedUser.name, verificationToken);

    await createAuditLog(
      typedUser._id.toString(),
      typedUser.companyId,
      'other',
      'user',
      typedUser._id.toString(),
      { message: 'Verification email resent' },
      req
    );

    res.json({ message: 'If your email is registered, a new verification email will be sent' });
  } catch (error) {
    logger.error('Resend verification email error:', error);
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      sendValidationError(res, errors);
      return;
    }
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
  } catch (error) {
    logger.error('Password strength check error:', error);
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      sendValidationError(res, errors);
      return;
    }
    next(error);
  }
};
/**
 * Get current user
 * @route GET /auth/me
 */
export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      sendError(res, 'Authentication required', 401, 'AUTHENTICATION_REQUIRED');
      return;
    }

    const user = await User.findById(authReq.user._id).select('-password');

    if (!user) {
      sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
      return;
    }

    sendSuccess(res, { user }, 'User retrieved successfully');
  } catch (error) {
    logger.error('Get user error:', error);
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
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      sendError(res, 'Authentication required', 401, 'AUTHENTICATION_REQUIRED');
      return;
    }

    // Validate password
    const schema = z.object({
      password: z.string().min(8, 'Password must be at least 8 characters'),
    });
    const { password } = schema.parse(req.body);

    const user = await User.findById(authReq.user._id);
    if (!user) {
      sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
      return;
    }

    const typedUser = user as IUser & { _id: mongoose.Types.ObjectId };

    // Check if user already has a password
    if (typedUser.password) {
      sendError(res, 'Password already set. Use change password instead.', 400, 'PASSWORD_EXISTS');
      return;
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
      sendValidationError(res, errors);
      return;
    }
    next(error);
  }
};

/**
 * Change password for authenticated user
 * @route POST /auth/change-password
 */
export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const schema = z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    });
    const { currentPassword, newPassword } = schema.parse(req.body);

    const user = await User.findById(authReq.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const typedUser = user as IUser & { _id: mongoose.Types.ObjectId };

    // Check if user has a password (OAuth users who haven't set password should use set-password)
    if (!typedUser.password) {
      sendError(res, 'No password set. Please use set-password endpoint first.', 400, 'NO_PASSWORD');
      return;
    }

    // Verify current password
    const isCurrentPasswordValid = await typedUser.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      sendError(res, 'Current password is incorrect', 401, 'INCORRECT_PASSWORD');
      return;
    }

    // Check new password is different
    if (currentPassword === newPassword) {
      sendError(res, 'New password must be different from current password', 400, 'SAME_PASSWORD');
      return;
    }

    // Update password and increment token version (invalidate all sessions)
    typedUser.password = newPassword;
    typedUser.security.tokenVersion = (typedUser.security.tokenVersion || 0) + 1;
    await typedUser.save();

    // Revoke all existing sessions
    await Session.updateMany(
      { userId: typedUser._id, isRevoked: false },
      { isRevoked: true }
    );

    await createAuditLog(
      typedUser._id.toString(),
      typedUser.companyId,
      'password_change',
      'user',
      typedUser._id.toString(),
      { message: 'Password changed successfully', success: true },
      req
    );

    sendSuccess(res, {
      sessionInvalidated: true
    }, 'Password changed successfully. Please login again with your new password.');
  } catch (error) {
    logger.error('Change password error:', error);
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      sendValidationError(res, errors);
      return;
    }
    next(error);
  }
};

/**
 * Request email change (sends verification to new email)
 * @route POST /auth/change-email
 */
export const changeEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const schema = z.object({
      newEmail: z.string().email('Invalid email format'),
      password: z.string(), // Require password for security
    });
    const { newEmail, password } = schema.parse(req.body);

    const user = await User.findById(authReq.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const typedUser = user as IUser & { _id: mongoose.Types.ObjectId };

    // Verify password (if user has one)
    if (typedUser.password) {
      const isPasswordValid = await typedUser.comparePassword(password);
      if (!isPasswordValid) {
        sendError(res, 'Invalid password', 401, 'INVALID_PASSWORD');
        return;
      }
    }

    // Check if new email is same as current
    if (typedUser.email.toLowerCase() === newEmail.toLowerCase()) {
      sendError(res, 'New email is same as current email', 400, 'SAME_EMAIL');
      return;
    }

    // Check if new email already exists
    const existingUser = await User.findOne({ email: newEmail.toLowerCase() });
    if (existingUser) {
      sendError(res, 'Email already in use', 409, 'EMAIL_IN_USE');
      return;
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // 24 hours

    // Store pending email change
    typedUser.pendingEmailChange = {
      email: newEmail.toLowerCase(),
      token: verificationToken,
      tokenExpiry: tokenExpiry,
    };
    await typedUser.save();

    // Send verification email to NEW email address
    await sendVerificationEmail(newEmail, typedUser.name, verificationToken);

    await createAuditLog(
      typedUser._id.toString(),
      typedUser.companyId,
      'other',
      'user',
      typedUser._id.toString(),
      { message: 'Email change requested', newEmail, success: true },
      req
    );

    sendSuccess(res, null, `Verification email sent to ${newEmail}. Please check your inbox to confirm the change.`);
  } catch (error) {
    logger.error('Change email error:', error);
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      sendValidationError(res, errors);
      return;
    }
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

    const user = await User.findOne({
      'pendingEmailChange.token': token,
      'pendingEmailChange.tokenExpiry': { $gt: new Date() },
    });

    if (!user) {
      sendError(res, 'Invalid or expired verification token', 400, 'INVALID_VERIFICATION_TOKEN');
      return;
    }

    const typedUser = user as IUser & { _id: mongoose.Types.ObjectId };

    if (!typedUser.pendingEmailChange) {
      sendError(res, 'No pending email change', 400, 'NO_PENDING_CHANGE');
      return;
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
      sendValidationError(res, errors);
      return;
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
    const { MagicLink } = await import('../../../../infrastructure/database/mongoose/models/index.js');
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
      sendValidationError(res, errors);
      return;
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
    const { MagicLink } = await import('../../../../infrastructure/database/mongoose/models/index.js');
    const magicLink = await MagicLink.findOne({
      token: hashedToken,
      expiresAt: { $gt: new Date() },
      usedAt: null, // Not yet used
    });

    if (!magicLink) {
      sendError(res, 'Invalid or expired magic link', 400, 'INVALID_MAGIC_LINK');
      return;
    }

    // Mark as used
    magicLink.usedAt = new Date();
    await magicLink.save();

    // Get user
    const user = await User.findById(magicLink.userId);

    if (!user) {
      sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
      return;
    }

    const typedUser = user as IUser & { _id: mongoose.Types.ObjectId };

    if (!typedUser.isActive) {
      sendError(res, 'Account is not active', 403, 'ACCOUNT_INACTIVE');
      return;
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

    // Return user data
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
        redirectUrl,
      },
      'Login successful'
    );
  } catch (error) {
    logger.error('Magic link verification error:', error);
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      sendValidationError(res, errors);
      return;
    }
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
};

export default authController;


