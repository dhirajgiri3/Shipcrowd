import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import {
cancelScheduledDeletion,
deactivateAccount,
reactivateAccount,
scheduleAccountDeletion
} from '../../../../core/application/services/user/account.service';
import { User } from '../../../../infrastructure/database/mongoose/models';
import { AppError, AuthenticationError, NotFoundError, ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { clearAuthCookies } from '../../../../shared/helpers/auth-cookies';
import logger from '../../../../shared/logger/winston.logger';
import { sendSuccess } from '../../../../shared/utils/responseHelper';

// Define validation schemas
const deactivateAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  reason: z.string().min(1, 'Reason is required').max(500),
});

const reactivateAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

const scheduleDeleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  reason: z.string().min(1, 'Reason is required').max(500),
  gracePeriodDays: z.number().int().min(1).max(90).default(30),
});

const cancelDeletionSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

const permanentDeleteSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  userId: z.string().optional(), // Only for admins
  anonymize: z.boolean().default(true),
});
void permanentDeleteSchema;

/**
 * Deactivate user account
 * @route POST /account/deactivate
 */
export const deactivateUserAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    // Validate input
    const validation = deactivateAccountSchema.safeParse(req.body);
    if (!validation.success) {
      const details = validation.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      throw new ValidationError('Validation failed', details);
    }

    // Verify password
    const user = await User.findById(req.user._id);
    if (!user) {
      throw new NotFoundError('User', ErrorCode.RES_USER_NOT_FOUND);
    }

    const isPasswordValid = await user.comparePassword(validation.data.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid password', ErrorCode.AUTH_INVALID_PASSWORD);
    }

    // Deactivate account
    const success = await deactivateAccount(
      req.user._id,
      validation.data.reason,
      req
    );

    if (success) {
      // Clear auth cookies
      clearAuthCookies(res);
      sendSuccess(
        res,
        null,
        'Your account has been deactivated. You can reactivate it by logging in again.'
      );
    } else {
      throw new AppError('Failed to deactivate account. Please try again later.', ErrorCode.BIZ_OPERATION_FAILED, 500);
    }
  } catch (error) {
    logger.error('Error deactivating account:', error);
    next(error);
  }
};

/**
 * Reactivate user account
 * @route POST /account/reactivate
 */
export const reactivateUserAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    // Validate input
    const validation = reactivateAccountSchema.safeParse(req.body);
    if (!validation.success) {
      const details = validation.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      throw new ValidationError('Validation failed', details);
    }

    // Verify password
    const user = await User.findById(req.user._id);
    if (!user) {
      throw new NotFoundError('User', ErrorCode.RES_USER_NOT_FOUND);
    }

    const isPasswordValid = await user.comparePassword(validation.data.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid password', ErrorCode.AUTH_INVALID_PASSWORD);
    }

    // Check if account is deleted
    if (user.isDeleted) {
      throw new AppError('Your account has been deleted and cannot be reactivated.', ErrorCode.BIZ_INVALID_STATE, 400);
    }

    if (user.isActive) {
      throw new AppError('Your account is already active.', ErrorCode.BIZ_CONFLICT, 400);
    }

    // Reactivate account
    const success = await reactivateAccount(req.user._id, req);

    if (success) {
      sendSuccess(res, null, 'Your account has been reactivated successfully.');
    } else {
      throw new AppError('Failed to reactivate account. Please try again later.', ErrorCode.BIZ_OPERATION_FAILED, 500);
    }
  } catch (error) {
    logger.error('Error reactivating account:', error);
    next(error);
  }
};

/**
 * Schedule account deletion
 * @route POST /account/delete
 */
export const scheduleAccountDeletionHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    // Validate input
    const validation = scheduleDeleteAccountSchema.safeParse(req.body);
    if (!validation.success) {
      const details = validation.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      throw new ValidationError('Validation failed', details);
    }

    // Verify password
    const user = await User.findById(req.user._id);
    if (!user) {
      throw new NotFoundError('User', ErrorCode.RES_USER_NOT_FOUND);
    }

    const isPasswordValid = await user.comparePassword(validation.data.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid password', ErrorCode.AUTH_INVALID_PASSWORD);
    }

    // Schedule account deletion
    const success = await scheduleAccountDeletion(
      req.user._id,
      validation.data.reason,
      validation.data.gracePeriodDays,
      req
    );

    if (success) {
      // Clear auth cookies
      clearAuthCookies(res);

      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + validation.data.gracePeriodDays);

      sendSuccess(
        res,
        { scheduledDeletionDate: deletionDate },
        `Your account has been scheduled for deletion on ${deletionDate.toDateString()}. You can cancel this action by logging in before that date.`
      );
    } else {
      throw new AppError('Failed to schedule account deletion. Please try again later.', ErrorCode.BIZ_OPERATION_FAILED, 500);
    }
  } catch (error) {
    logger.error('Error scheduling account deletion:', error);
    next(error);
  }
};

/**
 * Cancel scheduled account deletion
 * @route POST /account/cancel-deletion
 */
export const cancelScheduledDeletionHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    // Validate input
    const validation = cancelDeletionSchema.safeParse(req.body);
    if (!validation.success) {
      const details = validation.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      throw new ValidationError('Validation failed', details);
    }

    // Verify password
    const user = await User.findById(req.user._id);
    if (!user) {
      throw new NotFoundError('User', ErrorCode.RES_USER_NOT_FOUND);
    }

    const isPasswordValid = await user.comparePassword(validation.data.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid password', ErrorCode.AUTH_INVALID_PASSWORD);
    }

    // Check if deletion is scheduled
    if (!user.scheduledDeletionDate) {
      throw new AppError('No scheduled deletion found for your account.', ErrorCode.BIZ_NOT_FOUND, 400);
    }

    // Cancel scheduled deletion
    const success = await cancelScheduledDeletion(req.user._id, req);

    if (success) {
      sendSuccess(res, null, 'Your account deletion has been cancelled. Your account is now active again.');
    } else {
      throw new AppError('Failed to cancel account deletion. Please try again later.', ErrorCode.BIZ_OPERATION_FAILED, 500);
    }
  } catch (error) {
    logger.error('Error cancelling scheduled deletion:', error);
    next(error);
  }
};

const accountController = {
  deactivateUserAccount,
  reactivateUserAccount,
  scheduleAccountDeletionHandler,
  cancelScheduledDeletionHandler,
};

export default accountController;
