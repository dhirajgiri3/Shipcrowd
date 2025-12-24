import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../middleware/auth/auth';
import User from '../../../../infrastructure/database/mongoose/models/User';
import {
  deactivateAccount,
  reactivateAccount,
  scheduleAccountDeletion,
  cancelScheduledDeletion,
  permanentlyDeleteAccount
} from '../../../../core/application/services/user/account.service';
import { createAuditLog } from '../../middleware/system/auditLog';
import logger from '../../../../shared/logger/winston.logger';
import {
  sendSuccess,
  sendError,
  sendValidationError
} from '../../../../shared/utils/responseHelper';

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

/**
 * Deactivate user account
 * @route POST /account/deactivate
 */
export const deactivateUserAccount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    // Validate input
    const validation = deactivateAccountSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      sendValidationError(res, errors);
      return;
    }

    // Verify password
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

    // Deactivate account
    const success = await deactivateAccount(
      req.user._id,
      validation.data.reason,
      req
    );

    if (success) {
      // Clear auth cookie
      res.clearCookie('refreshToken');
      sendSuccess(
        res,
        null,
        'Your account has been deactivated. You can reactivate it by logging in again.'
      );
    } else {
      sendError(res, 'Failed to deactivate account. Please try again later.', 500, 'DEACTIVATION_FAILED');
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
export const reactivateUserAccount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    // Validate input
    const validation = reactivateAccountSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      sendValidationError(res, errors);
      return;
    }

    // Verify password
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

    // Check if account is deleted
    if (user.isDeleted) {
      sendError(res, 'Your account has been deleted and cannot be reactivated.', 400, 'ACCOUNT_DELETED');
      return;
    }

    if (user.isActive) {
      sendError(res, 'Your account is already active.', 400, 'ALREADY_ACTIVE');
      return;
    }

    // Reactivate account
    const success = await reactivateAccount(req.user._id, req);

    if (success) {
      sendSuccess(res, null, 'Your account has been reactivated successfully.');
    } else {
      sendError(res, 'Failed to reactivate account. Please try again later.', 500, 'REACTIVATION_FAILED');
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
export const scheduleAccountDeletionHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    // Validate input
    const validation = scheduleDeleteAccountSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      sendValidationError(res, errors);
      return;
    }

    // Verify password
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

    // Schedule account deletion
    const success = await scheduleAccountDeletion(
      req.user._id,
      validation.data.reason,
      validation.data.gracePeriodDays,
      req
    );

    if (success) {
      // Clear auth cookie
      res.clearCookie('refreshToken');

      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + validation.data.gracePeriodDays);

      sendSuccess(
        res,
        { scheduledDeletionDate: deletionDate },
        `Your account has been scheduled for deletion on ${deletionDate.toDateString()}. You can cancel this action by logging in before that date.`
      );
    } else {
      sendError(res, 'Failed to schedule account deletion. Please try again later.', 500, 'DELETION_SCHEDULE_FAILED');
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
export const cancelScheduledDeletionHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    // Validate input
    const validation = cancelDeletionSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      sendValidationError(res, errors);
      return;
    }

    // Verify password
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

    // Check if deletion is scheduled
    if (!user.scheduledDeletionDate) {
      sendError(res, 'No scheduled deletion found for your account.', 400, 'NO_SCHEDULED_DELETION');
      return;
    }

    // Cancel scheduled deletion
    const success = await cancelScheduledDeletion(req.user._id, req);

    if (success) {
      sendSuccess(res, null, 'Your account deletion has been cancelled. Your account is now active again.');
    } else {
      sendError(res, 'Failed to cancel account deletion. Please try again later.', 500, 'CANCEL_DELETION_FAILED');
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
