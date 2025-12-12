import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import User, { IUser } from '../../../infrastructure/database/mongoose/models/User';
import TeamInvitation from '../../../infrastructure/database/mongoose/models/TeamInvitation';
import Session from '../../../infrastructure/database/mongoose/models/Session';
import { createAuditLog } from '../middleware/auditLog';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, revokeRefreshToken } from '../../../shared/helpers/jwt';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../../core/application/services/communication/email.service';
import { createSession, updateSessionActivity, revokeSession, getUserSessions, revokeAllSessions } from '../../../core/application/services/auth/session.service';
import { meetsMinimumRequirements, evaluatePasswordStrength, PASSWORD_REQUIREMENTS } from '../../../core/application/services/auth/password.service';
import logger from '../../../shared/logger/winston.logger';
import { AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';

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
      res.status(400).json({ message: 'User already exists' });
      return; // Return void
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
        res.status(400).json({ message: 'Invalid or expired invitation token' });
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
      role: validatedData.role || (teamRole ? 'staff' : 'seller'),
      ...(companyId && { companyId }),
      ...(teamRole && { teamRole }),
      isActive: false,
      security: {
        verificationToken,
        verificationTokenExpiry,
      },
    });

    await user.save();
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

    res.status(201).json({
      message: 'User registered successfully. Please check your email to verify your account.',
      ...(companyId && { companyId: companyId.toString() })
    });
  } catch (error) {
    logger.error('Registration error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return; // Return void
    }
    next(error); // Pass other errors to error handling middleware
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
      res.status(401).json({ message: 'Invalid credentials' });
      return; // Return void
    }
    // Assert type after null check
    const typedUser = user as IUser & { _id: mongoose.Types.ObjectId };

    // Check if account is locked
    if (typedUser.security.lockUntil && typedUser.security.lockUntil > new Date()) {
      const minutesLeft = Math.ceil((typedUser.security.lockUntil.getTime() - new Date().getTime()) / (60 * 1000));
      res.status(401).json({
        message: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`,
        locked: true,
        lockExpires: typedUser.security.lockUntil
      });
      return;
    }

    if (!typedUser.isActive) {
      res.status(401).json({ message: 'Account is not active. Please verify your email.' });
      return; // Return void
    }
    if (typedUser.isDeleted) {
      res.status(401).json({ message: 'Account has been deleted' });
      return; // Return void
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
        res.status(401).json({
          message: 'Account is temporarily locked due to multiple failed login attempts. Please try again in 30 minutes.',
          locked: true,
          lockExpires: typedUser.security.lockUntil
        });
      } else {
        res.status(401).json({
          message: 'Invalid credentials',
          attemptsLeft: 5 - typedUser.security.failedLoginAttempts
        });
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

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: cookieMaxAge,
    });

    res.json({
      accessToken,
      user: {
        id: typedUser._id.toString(),
        name: typedUser.name,
        email: typedUser.email,
        role: typedUser.role,
        companyId: typedUser.companyId,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return; // Return void
    }
    next(error); // Pass other errors to error handling middleware
  }
};

/**
 * Refresh access token
 * @route POST /auth/refresh
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate that we have a refresh token from either cookies or body
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) {
      res.status(401).json({ message: 'Refresh token is required' });
      return;
    }

    try {
      const payload = await verifyRefreshToken(token);
      const user = await User.findById(payload.userId);
      if (!user) {
        res.status(401).json({ message: 'Invalid refresh token' });
        return; // Return void
      }
      // Assert type after null check
      const typedUser = user as IUser & { _id: mongoose.Types.ObjectId };

      if (typedUser.security.tokenVersion !== payload.tokenVersion) {
        res.status(401).json({ message: 'Invalid refresh token' });
        return; // Return void
      }

      // Check if the session exists and is valid
      const session = await Session.findOne({
        userId: typedUser._id,
        refreshToken: token,
        isRevoked: false,
        expiresAt: { $gt: new Date() }
      });

      if (!session) {
        res.status(401).json({ message: 'Session expired or invalid' });
        return;
      }

      // Update session activity
      await updateSessionActivity(token);

      const accessToken = generateAccessToken(typedUser._id.toString(), typedUser.role, typedUser.companyId);

      // Keep the same refresh token, don't generate a new one on every refresh
      // This helps with session tracking and management
      const newRefreshToken = token;

      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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

      res.json({ accessToken });
    } catch (tokenError) {
      logger.error('Token verification error:', tokenError);
      res.status(401).json({ message: 'Invalid refresh token' });
    }
  } catch (error) {
    logger.error('Token refresh error:', error);
    // Specific handling for refresh token errors
    res.status(401).json({ message: 'Invalid refresh token' });
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
      // Don't reveal user existence
      res.json({ message: 'If your email is registered, you will receive a password reset link' });
      return; // Return void
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
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return; // Return void
    }
    next(error); // Pass other errors to error handling middleware
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
      res.status(400).json({ message: 'Invalid or expired reset token' });
      return; // Return void
    }
    // Assert type after null check
    const typedUser = user as IUser & { _id: mongoose.Types.ObjectId };

    typedUser.password = validatedData.password;
    typedUser.security.resetToken = undefined;
    typedUser.security.resetTokenExpiry = undefined;
    typedUser.security.tokenVersion = (typedUser.security.tokenVersion || 0) + 1;
    await typedUser.save();

    await createAuditLog(
      typedUser._id.toString(),
      typedUser.companyId,
      'password_change',
      'user',
      typedUser._id.toString(),
      {
        message: 'Password reset completed',
        method: 'reset_token',
        success: true
      },
      req
    );

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    logger.error('Password reset error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return; // Return void
    }
    next(error); // Pass other errors to error handling middleware
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
      res.status(400).json({ message: 'Invalid or expired verification token' });
      return; // Return void
    }
    // Assert type after null check
    const typedUser = user as IUser & { _id: mongoose.Types.ObjectId };

    typedUser.isActive = true;
    typedUser.security.verificationToken = undefined;
    typedUser.security.verificationTokenExpiry = undefined;
    await typedUser.save();

    await createAuditLog(
      typedUser._id.toString(),
      typedUser.companyId,
      'update',
      'user',
      typedUser._id.toString(),
      { message: 'Email verified' },
      req
    );

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    logger.error('Email verification error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return; // Return void
    }
    next(error); // Pass other errors to error handling middleware
  }
};

/**
 * Logout user
 * @route POST /auth/logout
 */
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    // Clear the refresh token cookie
    res.clearCookie('refreshToken');

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

    res.json({ message: 'Logged out successfully' });
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
      // Don't reveal user existence
      res.json({ message: 'If your email is registered, a new verification email will be sent' });
      return;
    }

    // Assert type after null check
    const typedUser = user as IUser & { _id: mongoose.Types.ObjectId };

    // If user is already active, no need to send verification email
    if (typedUser.isActive) {
      res.json({ message: 'Your account is already verified' });
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
      res.status(400).json({ message: 'Validation error', errors: error.errors });
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

    res.json({
      score: strength.score,
      feedback: strength.feedback,
      isStrong: strength.isStrong,
      requirements: PASSWORD_REQUIREMENTS,
    });
  } catch (error) {
    logger.error('Password strength check error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
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
};

export default authController;
