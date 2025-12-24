import crypto from 'crypto';
import mongoose from 'mongoose';
import User, { IUser } from '../../../../infrastructure/database/mongoose/models/User';
import { createAuditLog } from '../../../../presentation/http/middleware/system/auditLog';
import { Request } from 'express';
import logger from '../../../../shared/logger/winston.logger';
import { sendRecoveryEmail } from '../communication/email.service';
import { NotFoundError, ValidationError } from '../../../../shared/errors/AppError';
import { ErrorCode } from '../../../../shared/errors/errorCodes';

// List of security questions for users to choose from
export const SECURITY_QUESTIONS = [
  'What was the name of your first pet?',
  'What was the name of your first school?',
  'In what city were you born?',
  'What is your mother\'s maiden name?',
  'What was the make of your first car?',
  'What is the name of your favorite childhood teacher?',
  'What is your favorite movie?',
  'What street did you grow up on?',
  'What was your childhood nickname?',
  'What is the name of your favorite childhood friend?',
];

/**
 * Set up security questions for account recovery
 */
export const setupSecurityQuestions = async (
  userId: string | mongoose.Types.ObjectId,
  questions: { question1: string; answer1: string; question2: string; answer2: string; question3: string; answer3: string },
  req?: Request
): Promise<boolean> => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      logger.error(`Setup security questions failed: User ${userId} not found`);
      return false;
    }

    // Hash the answers for security
    const hashedAnswers = {
      question1: questions.question1,
      answer1: hashAnswer(questions.answer1),
      question2: questions.question2,
      answer2: hashAnswer(questions.answer2),
      question3: questions.question3,
      answer3: hashAnswer(questions.answer3),
      lastUpdated: new Date(),
    };

    // Initialize recovery options if not exists
    if (!user.security.recoveryOptions) {
      user.security.recoveryOptions = {
        securityQuestions: hashedAnswers,
        lastUpdated: new Date(),
      };
    } else {
      user.security.recoveryOptions.securityQuestions = hashedAnswers;
      user.security.recoveryOptions.lastUpdated = new Date();
    }

    await user.save();

    // Log the action
    if (req) {
      await createAuditLog(
        userId,
        user.companyId,
        'security',
        'user',
        userId,
        {
          message: 'Security questions set up',
          success: true,
        },
        req
      );
    }

    logger.info(`Security questions set up for user ${userId}`);
    return true;
  } catch (error) {
    logger.error('Error setting up security questions:', error);
    return false;
  }
};

/**
 * Set up backup email for account recovery
 */
export const setupBackupEmail = async (
  userId: string | mongoose.Types.ObjectId,
  backupEmail: string,
  req?: Request
): Promise<boolean> => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      logger.error(`Setup backup email failed: User ${userId} not found`);
      return false;
    }

    // Check if backup email is different from primary email
    if (user.email === backupEmail) {
      logger.error(`Setup backup email failed: Backup email cannot be the same as primary email`);
      return false;
    }

    // Initialize recovery options if not exists
    if (!user.security.recoveryOptions) {
      user.security.recoveryOptions = {
        backupEmail,
        lastUpdated: new Date(),
      };
    } else {
      user.security.recoveryOptions.backupEmail = backupEmail;
      user.security.recoveryOptions.lastUpdated = new Date();
    }

    await user.save();

    // Log the action
    if (req) {
      await createAuditLog(
        userId,
        user.companyId,
        'security',
        'user',
        userId,
        {
          message: 'Backup email set up',
          success: true,
        },
        req
      );
    }

    logger.info(`Backup email set up for user ${userId}`);
    return true;
  } catch (error) {
    logger.error('Error setting up backup email:', error);
    return false;
  }
};

/**
 * Generate recovery keys for account recovery
 */
export const generateRecoveryKeys = async (
  userId: string | mongoose.Types.ObjectId,
  req?: Request
): Promise<string[] | null> => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      logger.error(`Generate recovery keys failed: User ${userId} not found`);
      return null;
    }

    // Generate 5 recovery keys
    const recoveryKeys: string[] = [];
    for (let i = 0; i < 5; i++) {
      // Format: XXXX-XXXX-XXXX-XXXX (16 characters + 3 hyphens)
      const key = `${crypto.randomBytes(2).toString('hex').toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      recoveryKeys.push(key);
    }

    // Hash the keys for storage
    const hashedKeys = recoveryKeys.map(key => hashRecoveryKey(key));

    // Initialize recovery options if not exists
    if (!user.security.recoveryOptions) {
      user.security.recoveryOptions = {
        recoveryKeys: hashedKeys,
        lastUpdated: new Date(),
      };
    } else {
      user.security.recoveryOptions.recoveryKeys = hashedKeys;
      user.security.recoveryOptions.lastUpdated = new Date();
    }

    await user.save();

    // Log the action
    if (req) {
      await createAuditLog(
        userId,
        user.companyId,
        'security',
        'user',
        userId,
        {
          message: 'Recovery keys generated',
          success: true,
        },
        req
      );
    }

    logger.info(`Recovery keys generated for user ${userId}`);
    return recoveryKeys;
  } catch (error) {
    logger.error('Error generating recovery keys:', error);
    return null;
  }
};

/**
 * Verify security question answers for account recovery
 */
export const verifySecurityQuestions = async (
  email: string,
  answers: { question1: string; answer1: string; question2: string; answer2: string; question3: string; answer3: string },
  req?: Request
): Promise<boolean> => {
  try {
    const user = await User.findOne({ email });
    if (!user || !user.security.recoveryOptions || !user.security.recoveryOptions.securityQuestions) {
      logger.error(`Verify security questions failed: User not found or security questions not set up`);
      return false;
    }

    const storedQuestions = user.security.recoveryOptions.securityQuestions;

    // Verify that the questions match
    if (
      storedQuestions.question1 !== answers.question1 ||
      storedQuestions.question2 !== answers.question2 ||
      storedQuestions.question3 !== answers.question3
    ) {
      logger.error(`Verify security questions failed: Questions don't match`);
      return false;
    }

    // Verify the answers
    const isAnswer1Valid = verifyAnswer(answers.answer1, storedQuestions.answer1);
    const isAnswer2Valid = verifyAnswer(answers.answer2, storedQuestions.answer2);
    const isAnswer3Valid = verifyAnswer(answers.answer3, storedQuestions.answer3);

    const isValid = isAnswer1Valid && isAnswer2Valid && isAnswer3Valid;

    // Log the action
    if (req) {
      await createAuditLog(
        user._id as string,
        user.companyId,
        'security',
        'user',
        user._id as string,
        {
          message: `Security questions verification ${isValid ? 'succeeded' : 'failed'}`,
          success: isValid,
        },
        req
      );
    }

    return isValid;
  } catch (error) {
    logger.error('Error verifying security questions:', error);
    return false;
  }
};

/**
 * Hash a security question answer
 */
const hashAnswer = (answer: string): string => {
  // Normalize the answer (lowercase, trim, remove extra spaces)
  const normalizedAnswer = answer.toLowerCase().trim().replace(/\s+/g, ' ');

  // Hash the answer
  return crypto.createHash('sha256').update(normalizedAnswer).digest('hex');
};

/**
 * Verify a security question answer
 */
const verifyAnswer = (providedAnswer: string, storedHashedAnswer: string): boolean => {
  // Normalize the provided answer
  const normalizedAnswer = providedAnswer.toLowerCase().trim().replace(/\s+/g, ' ');

  // Hash the provided answer and compare with stored hash
  const hashedProvidedAnswer = crypto.createHash('sha256').update(normalizedAnswer).digest('hex');

  return hashedProvidedAnswer === storedHashedAnswer;
};

/**
 * Hash a recovery key
 */
const hashRecoveryKey = (key: string): string => {
  return crypto.createHash('sha256').update(key).digest('hex');
};

/**
 * Verify a recovery key
 */
export const verifyRecoveryKey = async (
  email: string,
  recoveryKey: string,
  req?: Request
): Promise<boolean> => {
  try {
    const user = await User.findOne({ email });
    if (!user || !user.security.recoveryOptions || !user.security.recoveryOptions.recoveryKeys) {
      logger.error(`Verify recovery key failed: User not found or recovery keys not set up`);
      return false;
    }

    // Hash the provided key
    const hashedKey = hashRecoveryKey(recoveryKey);

    // Check if the hashed key exists in the user's recovery keys
    const isValid = user.security.recoveryOptions.recoveryKeys.includes(hashedKey);

    // If valid, remove the used key
    if (isValid) {
      user.security.recoveryOptions.recoveryKeys = user.security.recoveryOptions.recoveryKeys.filter(
        key => key !== hashedKey
      );
      await user.save();
    }

    // Log the action
    if (req) {
      await createAuditLog(
        user._id as string,
        user.companyId,
        'security',
        'user',
        user._id as string,
        {
          message: `Recovery key verification ${isValid ? 'succeeded' : 'failed'}`,
          success: isValid,
        },
        req
      );
    }

    return isValid;
  } catch (error) {
    logger.error('Error verifying recovery key:', error);
    return false;
  }
};

export default {
  setupSecurityQuestions,
  setupBackupEmail,
  generateRecoveryKeys,
  verifySecurityQuestions,
  verifyRecoveryKey,
  SECURITY_QUESTIONS,
};
