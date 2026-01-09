import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { User } from '../../../../infrastructure/database/mongoose/models';
import {
  setupSecurityQuestions,
  setupBackupEmail,
  generateRecoveryKeys
} from '../../../../core/application/services/user/recovery.service';
import { SECURITY_QUESTIONS } from '../../../../shared/constants/security';
import { sendRecoveryEmail } from '../../../../core/application/services/communication/email.service';
import { createAuditLog } from '../../middleware/system/audit-log.middleware';
import logger from '../../../../shared/logger/winston.logger';
import { sendSuccess, sendError, sendValidationError } from '../../../../shared/utils/responseHelper';

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
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    const validation = securityQuestionsSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      sendValidationError(res, errors);
      return;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
      return;
    }

    const isPasswordValid = await user.comparePassword(validation.data.password);
    if (!isPasswordValid) {
      sendError(res, 'Invalid password', 401, 'INVALID_PASSWORD');
      return;
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
      sendError(res, 'Failed to set up security questions', 500, 'SETUP_FAILED');
    }
  } catch (error) {
    logger.error('Error setting up security questions:', error);
    next(error);
  }
};

export const setupBackupEmailHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    const validation = backupEmailSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      sendValidationError(res, errors);
      return;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
      return;
    }

    const isPasswordValid = await user.comparePassword(validation.data.password);
    if (!isPasswordValid) {
      sendError(res, 'Invalid password', 401, 'INVALID_PASSWORD');
      return;
    }

    const success = await setupBackupEmail(req.user._id as string, validation.data.backupEmail, req);

    if (success) {
      sendSuccess(res, { success: true }, 'Backup email set up successfully');
    } else {
      sendError(res, 'Failed to set up backup email', 500, 'SETUP_FAILED');
    }
  } catch (error) {
    logger.error('Error setting up backup email:', error);
    next(error);
  }
};

export const generateRecoveryKeysHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    const validation = generateKeysSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      sendValidationError(res, errors);
      return;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
      return;
    }

    const isPasswordValid = await user.comparePassword(validation.data.password);
    if (!isPasswordValid) {
      sendError(res, 'Invalid password', 401, 'INVALID_PASSWORD');
      return;
    }

    const recoveryKeys = await generateRecoveryKeys(req.user._id as string, req);

    if (recoveryKeys) {
      sendSuccess(res, { recoveryKeys, success: true }, 'Recovery keys generated successfully');
    } else {
      sendError(res, 'Failed to generate recovery keys', 500, 'KEY_GENERATION_FAILED');
    }
  } catch (error) {
    logger.error('Error generating recovery keys:', error);
    next(error);
  }
};

export const getRecoveryStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    const user = await User.findById(req.user._id).lean();
    if (!user) {
      sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
      return;
    }

    const recoveryOptions = user.security.recoveryOptions || {};

    sendSuccess(res, {
      hasSecurityQuestions: !!recoveryOptions.securityQuestions,
      hasBackupEmail: !!recoveryOptions.backupEmail,
      hasRecoveryKeys: !!(recoveryOptions.recoveryKeys && recoveryOptions.recoveryKeys.length > 0),
      backupEmail: recoveryOptions.backupEmail,
      lastUpdated: recoveryOptions.lastUpdated,
    }, 'Recovery status retrieved successfully');
  } catch (error) {
    logger.error('Error getting recovery status:', error);
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
      sendValidationError(res, errors);
      return;
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
  } catch (error) {
    logger.error('Error sending recovery options email:', error);
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
      sendError(res, 'Email is required', 400, 'EMAIL_REQUIRED');
      return;
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
    const { RecoveryToken } = await import('../../../../infrastructure/database/mongoose/models/index.js');
    const { sendAccountRecoveryEmail } = await import('../../../../core/application/services/communication/email.service.js');

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
      user.companyId ? (user.companyId as mongoose.Types.ObjectId).toString() : '',
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
  } catch (error) {
    logger.error('Account recovery request error:', error);
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
      sendError(res, 'Recovery token is required', 400, 'TOKEN_REQUIRED');
      return;
    }

    // Hash the token to match database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Dynamically import RecoveryToken
    const { RecoveryToken } = await import('../../../../infrastructure/database/mongoose/models/index.js');

    // Find valid recovery token
    const recoveryToken = await RecoveryToken.findOne({
      token: hashedToken,
      expiresAt: { $gt: new Date() },
      usedAt: null,
    });

    if (!recoveryToken) {
      logger.warn(`Invalid or expired recovery token attempted from IP ${req.ip}`);
      sendError(res, 'Invalid or expired recovery token', 400, 'INVALID_TOKEN');
      return;
    }

    // Mark token as used
    recoveryToken.usedAt = new Date();
    await recoveryToken.save();

    // Get user
    const user = await User.findById(recoveryToken.userId).select(
      '+security.failedLoginAttempts +security.lockUntil'
    );

    if (!user) {
      sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
      return;
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
        user.companyId ? (user.companyId as mongoose.Types.ObjectId).toString() : '',
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
  } catch (error) {
    logger.error('Account recovery verification error:', error);
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
