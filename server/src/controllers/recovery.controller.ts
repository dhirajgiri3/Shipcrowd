import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import {
  setupSecurityQuestions,
  setupBackupEmail,
  generateRecoveryKeys,
  verifySecurityQuestions,
  verifyRecoveryKey,
  SECURITY_QUESTIONS
} from '../services/recovery.service';
import { sendRecoveryEmail } from '../services/email.service';
import { createAuditLog } from '../middleware/auditLog';
import logger from '../utils/logger';

// Define validation schemas
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

const verifyQuestionsSchema = z.object({
  email: z.string().email('Invalid email format'),
  question1: z.string().min(1, 'Question 1 is required'),
  answer1: z.string().min(1, 'Answer 1 is required'),
  question2: z.string().min(1, 'Question 2 is required'),
  answer2: z.string().min(1, 'Answer 2 is required'),
  question3: z.string().min(1, 'Question 3 is required'),
  answer3: z.string().min(1, 'Answer 3 is required'),
});

const verifyKeySchema = z.object({
  email: z.string().email('Invalid email format'),
  recoveryKey: z.string().min(1, 'Recovery key is required'),
});

const sendRecoveryOptionsSchema = z.object({
  email: z.string().email('Invalid email format'),
});

/**
 * Get available security questions
 * @route GET /recovery/security-questions
 */
export const getSecurityQuestions = async (req: Request, res: Response): Promise<void> => {
  res.json({ questions: SECURITY_QUESTIONS });
};

/**
 * Set up security questions
 * @route POST /recovery/setup-questions
 */
export const setupSecurityQuestionsHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const validatedData = securityQuestionsSchema.parse(req.body);

    // Verify password
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const isPasswordValid = await user.comparePassword(validatedData.password);
    if (!isPasswordValid) {
      res.status(401).json({ message: 'Invalid password' });
      return;
    }

    // Set up security questions
    const success = await setupSecurityQuestions(
      req.user._id as string,
      {
        question1: validatedData.question1,
        answer1: validatedData.answer1,
        question2: validatedData.question2,
        answer2: validatedData.answer2,
        question3: validatedData.question3,
        answer3: validatedData.answer3,
      },
      req
    );

    if (success) {
      res.json({
        message: 'Security questions set up successfully',
        success: true
      });
    } else {
      res.status(500).json({
        message: 'Failed to set up security questions',
        success: false
      });
    }
  } catch (error) {
    logger.error('Error setting up security questions:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    next(error);
  }
};

/**
 * Set up backup email
 * @route POST /recovery/setup-backup-email
 */
export const setupBackupEmailHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const validatedData = backupEmailSchema.parse(req.body);

    // Verify password
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const isPasswordValid = await user.comparePassword(validatedData.password);
    if (!isPasswordValid) {
      res.status(401).json({ message: 'Invalid password' });
      return;
    }

    // Set up backup email
    const success = await setupBackupEmail(
      req.user._id as string,
      validatedData.backupEmail,
      req
    );

    if (success) {
      res.json({
        message: 'Backup email set up successfully',
        success: true
      });
    } else {
      res.status(500).json({
        message: 'Failed to set up backup email',
        success: false
      });
    }
  } catch (error) {
    logger.error('Error setting up backup email:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    next(error);
  }
};

/**
 * Generate recovery keys
 * @route POST /recovery/generate-keys
 */
export const generateRecoveryKeysHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const validatedData = generateKeysSchema.parse(req.body);

    // Verify password
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const isPasswordValid = await user.comparePassword(validatedData.password);
    if (!isPasswordValid) {
      res.status(401).json({ message: 'Invalid password' });
      return;
    }

    // Generate recovery keys
    const recoveryKeys = await generateRecoveryKeys(req.user._id as string, req);

    if (recoveryKeys) {
      res.json({
        message: 'Recovery keys generated successfully',
        recoveryKeys,
        success: true
      });
    } else {
      res.status(500).json({
        message: 'Failed to generate recovery keys',
        success: false
      });
    }
  } catch (error) {
    logger.error('Error generating recovery keys:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    next(error);
  }
};

/**
 * Get recovery options status
 * @route GET /recovery/status
 */
export const getRecoveryStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const recoveryOptions = user.security.recoveryOptions || {};

    res.json({
      hasSecurityQuestions: !!recoveryOptions.securityQuestions,
      hasBackupEmail: !!recoveryOptions.backupEmail,
      hasRecoveryKeys: !!(recoveryOptions.recoveryKeys && recoveryOptions.recoveryKeys.length > 0),
      backupEmail: recoveryOptions.backupEmail,
      lastUpdated: recoveryOptions.lastUpdated,
    });
  } catch (error) {
    logger.error('Error getting recovery status:', error);
    next(error);
  }
};

/**
 * Send recovery options email
 * @route POST /recovery/send-options
 */
export const sendRecoveryOptionsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = sendRecoveryOptionsSchema.parse(req.body);

    const user = await User.findOne({ email: validatedData.email });
    if (!user) {
      // Don't reveal user existence
      res.json({
        message: 'If your email is registered, a recovery options email will be sent',
        success: true
      });
      return;
    }

    const recoveryOptions = user.security.recoveryOptions || {};

    // Send recovery options email
    await sendRecoveryEmail(
      user.email,
      user.name,
      {
        hasSecurityQuestions: !!recoveryOptions.securityQuestions,
        hasBackupEmail: !!recoveryOptions.backupEmail,
        hasRecoveryKeys: !!(recoveryOptions.recoveryKeys && recoveryOptions.recoveryKeys.length > 0),
        backupEmail: recoveryOptions.backupEmail,
      }
    );

    // Log the action
    await createAuditLog(
      user._id as string,
      user.companyId,
      'security',
      'user',
      user._id as string,
      {
        message: 'Recovery options email sent',
        success: true,
      },
      req
    );

    res.json({
      message: 'If your email is registered, a recovery options email will be sent',
      success: true
    });
  } catch (error) {
    logger.error('Error sending recovery options email:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
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
