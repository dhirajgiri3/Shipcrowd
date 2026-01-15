import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { User, RecoveryToken } from '../../../../infrastructure/database/mongoose/models';
import {
  setupSecurityQuestions,
  setupBackupEmail,
  generateRecoveryKeys
} from '../../../../core/application/services/user/recovery.service';
import { SECURITY_QUESTIONS } from '../../../../shared/constants/security';
import { sendAccountRecoveryEmail, sendRecoveryEmail } from '../../../../core/application/services/communication/email.service';
import { createAuditLog } from '../../middleware/system/audit-log.middleware';
import logger from '../../../../shared/logger/winston.logger';
import { sendSuccess } from '../../../../shared/utils/responseHelper';
import { AuthenticationError, ValidationError, DatabaseError, NotFoundError, AppError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';

// ============================================================================
// ERROR HANDLING HELPER
// ============================================================================

/**
 * Centralized error handler for recovery controller
 */

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const securityQuestionsSchema = z.object({
  question1: z.string().min(1, 'Question 1 is required'),
  answer1: z.string().min(1, 'Answer 1 is required'),
  question2: z.string().min(1, 'Question 2 is required'),
  answer2: z.string().min(1, 'Answer 2 is required'),
  question3: z.string().min(1, 'Question 3 is required'),
  answer3: z.string().min(1, 'Answer 3 is required'),
  password: z.string().min(1, 'Password is required'),
});

const backupEmailSchema = z.object({
  backupEmail: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const generateKeysSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

const sendRecoveryOptionsSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const getSecurityQuestions = async (req: Request, res: Response): Promise<void> => {
  sendSuccess(res, { questions: SECURITY_QUESTIONS }, 'Security questions retrieved');
};

export const setupSecurityQuestionsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    const validation = securityQuestionsSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      throw new ValidationError('Validation failed', errors);
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      throw new NotFoundError('User', ErrorCode.RES_USER_NOT_FOUND);
    }

    const isPasswordValid = await user.comparePassword(validation.data.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid password', ErrorCode.AUTH_INVALID_PASSWORD);
    }

    const success = await setupSecurityQuestions(
      req.user._id as string,
      {
        question1: validation.data.question1,
        answer1: validation.data.answer1,
        question2: validation.data.question2,
        answer2: validation.data.answer2,
        question3: validation.data.question3,
        answer3: validation.data.answer3,
      },
      req
    );

    if (success) {
      sendSuccess(res, { success: true }, 'Security questions set up successfully');
    } else {
      throw new AppError('Failed to set up security questions', ErrorCode.BIZ_SETUP_FAILED);
    }
  } catch (error: any) {
    logger.error('setupSecurityQuestions error:', error);
    next(error);
  }
};

export const setupBackupEmailHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    const validation = backupEmailSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      throw new ValidationError('Validation failed', errors);
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      throw new NotFoundError('User', ErrorCode.RES_USER_NOT_FOUND);
    }

    const isPasswordValid = await user.comparePassword(validation.data.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid password', ErrorCode.AUTH_INVALID_PASSWORD);
    }

    const success = await setupBackupEmail(req.user._id as string, validation.data.backupEmail, req);

    if (success) {
      sendSuccess(res, { success: true }, 'Backup email set up successfully');
    } else {
      throw new AppError('Failed to set up backup email', ErrorCode.BIZ_SETUP_FAILED);
    }
  } catch (error: any) {
    logger.error('setupBackupEmail error:', error);
    next(error);
  }
};

export const generateRecoveryKeysHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    const validation = generateKeysSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      throw new ValidationError('Validation failed', errors);
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      throw new NotFoundError('User', ErrorCode.RES_USER_NOT_FOUND);
    }

    const isPasswordValid = await user.comparePassword(validation.data.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid password', ErrorCode.AUTH_INVALID_PASSWORD);
    }

    const recoveryKeys = await generateRecoveryKeys(req.user._id as string, req);

    if (recoveryKeys) {
      sendSuccess(res, { recoveryKeys, success: true }, 'Recovery keys generated successfully');
    } else {
      throw new AppError('Failed to generate recovery keys', ErrorCode.BIZ_OPERATION_FAILED);
    }
  } catch (error: any) {
    logger.error('generateRecoveryKeys error:', error);
    next(error);
  }
};

export const getRecoveryStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    const user = await User.findById(req.user._id).lean();
    if (!user) {
      throw new NotFoundError('User', ErrorCode.RES_USER_NOT_FOUND);
    }

    const recoveryOptions = user.security.recoveryOptions || {};

    sendSuccess(res, {
      hasSecurityQuestions: !!recoveryOptions.securityQuestions,
      hasBackupEmail: !!recoveryOptions.backupEmail,
      hasRecoveryKeys: !!(recoveryOptions.recoveryKeys && recoveryOptions.recoveryKeys.length > 0),
      backupEmail: recoveryOptions.backupEmail,
      lastUpdated: recoveryOptions.lastUpdated,
    }, 'Recovery status retrieved successfully');
  } catch (error: any) {
    logger.error('getRecoveryStatus error:', error);
    next(error);
  }
};

export const sendRecoveryOptionsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validation = sendRecoveryOptionsSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      throw new ValidationError('Validation failed', errors);
    }

    const user = await User.findOne({ email: validation.data.email }).lean();
    if (!user) {
      sendSuccess(res, { success: true }, 'If your email is registered, a recovery options email will be sent');
      return;
    }

    const recoveryOptions = user.security.recoveryOptions || {};

    await sendRecoveryEmail(user.email, user.name, {
      hasSecurityQuestions: !!recoveryOptions.securityQuestions,
      hasBackupEmail: !!recoveryOptions.backupEmail,
      hasRecoveryKeys: !!(recoveryOptions.recoveryKeys && recoveryOptions.recoveryKeys.length > 0),
      backupEmail: recoveryOptions.backupEmail,
    });

    await createAuditLog(
      user._id as string,
      user.companyId,
      'security',
      'user',
      user._id as string,
      { message: 'Recovery options email sent', success: true },
      req
    );

    sendSuccess(res, { success: true }, 'If your email is registered, a recovery options email will be sent');
  } catch (error: any) {
    logger.error('sendRecoveryOptions error:', error);
    next(error);
  }
};

/**
 * Request account recovery via email (for locked accounts)
 * @route POST /api/v1/auth/recovery/request-unlock
 */
export const requestAccountRecovery = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ValidationError('Email is required', { field: 'email', message: 'Email is required' });
    }

    // Generic response message to prevent user enumeration
    const genericMessage = 'If your email is registered, you will receive recovery instructions shortly';

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      '+security.lockUntil'
    );

    // If user doesn't exist, still send generic success response
    if (!user) {
      logger.warn(`Account recovery requested for non-existent email: ${email}`);
      sendSuccess(res, null, genericMessage);
      return;
    }

    // Dynamically import RecoveryToken and email service

    // Generate recovery token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Create recovery token record
    await RecoveryToken.create({
      userId: user._id,
      token: hashedToken,
      method: 'email',
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
      ip: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });

    // Send recovery email with the raw (unhashed) token
    const recoveryUrl = `${process.env.CLIENT_URL}/account-recovery?token=${rawToken}`;
    await sendAccountRecoveryEmail(user.email, user.name, recoveryUrl);

    // Audit log
    await createAuditLog(
      (user._id as mongoose.Types.ObjectId).toString(),
      user.companyId?.toString(),
      'security',
      'user',
      (user._id as mongoose.Types.ObjectId).toString(),
      {
        message: 'Account recovery requested',
        ip: req.ip || 'unknown',
        method: 'email',
      },
      req
    );

    logger.info(`Account recovery requested for user ${user._id} from IP ${req.ip}`);

    sendSuccess(res, null, genericMessage);
  } catch (error: any) {
    logger.error('requestAccountRecovery error:', error);
    next(error);
  }
};

/**
 * Verify recovery token and unlock account
 * @route POST /api/v1/auth/recovery/verify-unlock
 */
export const verifyRecoveryToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      throw new ValidationError('Recovery token is required', { field: 'token', message: 'Recovery token is required' });
    }

    // Hash the token to match database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Dynamically import RecoveryToken

    // Find valid recovery token
    const recoveryToken = await RecoveryToken.findOne({
      token: hashedToken,
      expiresAt: { $gt: new Date() },
      usedAt: null,
    });

    if (!recoveryToken) {
      logger.warn(`Invalid or expired recovery token attempted from IP ${req.ip}`);
      throw new ValidationError('Invalid or expired recovery token', { field: 'token', message: 'Invalid or expired recovery token' });
    }

    // Mark token as used
    recoveryToken.usedAt = new Date();
    await recoveryToken.save();

    // Get user
    const user = await User.findById(recoveryToken.userId).select(
      '+security.failedLoginAttempts +security.lockUntil'
    );

    if (!user) {
      throw new NotFoundError('User', ErrorCode.RES_USER_NOT_FOUND);
    }

    // Start session for atomic updates
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Unlock account if locked (check lockUntil field)
      if (user.security?.lockUntil && user.security.lockUntil > new Date()) {
        user.security.lockUntil = undefined;
      }

      // Reset failed login attempts
      user.security.failedLoginAttempts = 0;

      await user.save({ session });

      // Audit log
      await createAuditLog(
        (user._id as mongoose.Types.ObjectId).toString(),
        user.companyId?.toString(),
        'account_unlock',
        'user',
        (user._id as mongoose.Types.ObjectId).toString(),
        {
          message: 'Account recovered via email verification',
          ip: req.ip || 'unknown',
          method: 'email',
        },
        req
      );

      await session.commitTransaction();

      logger.info(`Account recovered successfully for user ${user._id}`);

      sendSuccess(
        res,
        {
          email: user.email,
          nextStep: 'reset_password',
          redirectUrl: '/reset-password',
        },
        'Account recovered successfully. Please reset your password to continue.'
      );
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  } catch (error: any) {
    logger.error('verifyRecoveryMethod error:', error);
    next(error);
  }
};

const recoveryController = {
  getSecurityQuestions,
  setupSecurityQuestionsHandler,
  setupBackupEmailHandler,
  generateRecoveryKeysHandler,
  getRecoveryStatus,
  sendRecoveryOptionsHandler,
  requestAccountRecovery,
  verifyRecoveryToken,
};

export default recoveryController;
