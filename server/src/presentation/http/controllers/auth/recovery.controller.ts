import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../middleware/auth/auth';
import User from '../../../../infrastructure/database/mongoose/models/User';
import {
  setupSecurityQuestions,
  setupBackupEmail,
  generateRecoveryKeys,
  verifySecurityQuestions,
  verifyRecoveryKey,
  SECURITY_QUESTIONS
} from '../../../../core/application/services/user/recovery.service';
import { sendRecoveryEmail } from '../../../../core/application/services/communication/email.service';
import { createAuditLog } from '../../middleware/system/auditLog';
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

export const setupSecurityQuestionsHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

export const setupBackupEmailHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

export const generateRecoveryKeysHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

export const getRecoveryStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

const recoveryController = {
  getSecurityQuestions,
  setupSecurityQuestionsHandler,
  setupBackupEmailHandler,
  generateRecoveryKeysHandler,
  getRecoveryStatus,
  sendRecoveryOptionsHandler,
};

export default recoveryController;
