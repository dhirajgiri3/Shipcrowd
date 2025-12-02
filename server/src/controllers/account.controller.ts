import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import {
  deactivateAccount,
  reactivateAccount,
  scheduleAccountDeletion,
  cancelScheduledDeletion,
  permanentlyDeleteAccount
} from '../services/account.service';
import { createAuditLog } from '../middleware/auditLog';
import logger from '../utils/logger';

// Define validation schemas
const deactivateAccountSchema = z.object({
  password: z.string(),
  reason: z.string().min(1, 'Reason is required').max(500),
});

const reactivateAccountSchema = z.object({
  password: z.string(),
});

const scheduleDeleteAccountSchema = z.object({
  password: z.string(),
  reason: z.string().min(1, 'Reason is required').max(500),
  gracePeriodDays: z.number().int().min(1).max(90).default(30),
});

const cancelDeletionSchema = z.object({
  password: z.string(),
});

const permanentDeleteSchema = z.object({
  password: z.string(),
  userId: z.string().optional(), // Only for admins
  anonymize: z.boolean().default(true),
});

/**
 * Deactivate user account
 * @route POST /account/deactivate
 */
export const deactivateUserAccount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = deactivateAccountSchema.parse(req.body);

    // Check if user is authenticated
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

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

    // Deactivate account
    const success = await deactivateAccount(
      req.user._id,
      validatedData.reason,
      req
    );

    if (success) {
      // Clear auth cookie
      res.clearCookie('refreshToken');

      res.json({
        message: 'Your account has been deactivated. You can reactivate it by logging in again.',
        success: true
      });
    } else {
      res.status(500).json({
        message: 'Failed to deactivate account. Please try again later.',
        success: false
      });
    }
  } catch (error) {
    logger.error('Error deactivating account:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    next(error);
  }
};

/**
 * Reactivate user account
 * @route POST /account/reactivate
 */
export const reactivateUserAccount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = reactivateAccountSchema.parse(req.body);

    // Check if user is authenticated
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

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

    // Check if account is deactivated but not deleted
    if (user.isDeleted) {
      res.status(400).json({
        message: 'Your account has been deleted and cannot be reactivated.',
        success: false
      });
      return;
    }

    if (user.isActive) {
      res.status(400).json({
        message: 'Your account is already active.',
        success: false
      });
      return;
    }

    // Reactivate account
    const success = await reactivateAccount(req.user._id, req);

    if (success) {
      res.json({
        message: 'Your account has been reactivated successfully.',
        success: true
      });
    } else {
      res.status(500).json({
        message: 'Failed to reactivate account. Please try again later.',
        success: false
      });
    }
  } catch (error) {
    logger.error('Error reactivating account:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    next(error);
  }
};

/**
 * Schedule account deletion
 * @route POST /account/delete
 */
export const scheduleAccountDeletionHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = scheduleDeleteAccountSchema.parse(req.body);

    // Check if user is authenticated
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

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

    // Schedule account deletion
    const success = await scheduleAccountDeletion(
      req.user._id,
      validatedData.reason,
      validatedData.gracePeriodDays,
      req
    );

    if (success) {
      // Clear auth cookie
      res.clearCookie('refreshToken');

      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + validatedData.gracePeriodDays);

      res.json({
        message: `Your account has been scheduled for deletion on ${deletionDate.toDateString()}. You can cancel this action by logging in before that date.`,
        scheduledDeletionDate: deletionDate,
        success: true
      });
    } else {
      res.status(500).json({
        message: 'Failed to schedule account deletion. Please try again later.',
        success: false
      });
    }
  } catch (error) {
    logger.error('Error scheduling account deletion:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    next(error);
  }
};

/**
 * Cancel scheduled account deletion
 * @route POST /account/cancel-deletion
 */
export const cancelScheduledDeletionHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = cancelDeletionSchema.parse(req.body);

    // Check if user is authenticated
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

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

    // Check if deletion is scheduled
    if (!user.scheduledDeletionDate) {
      res.status(400).json({
        message: 'No scheduled deletion found for your account.',
        success: false
      });
      return;
    }

    // Cancel scheduled deletion
    const success = await cancelScheduledDeletion(req.user._id, req);

    if (success) {
      res.json({
        message: 'Your account deletion has been cancelled. Your account is now active again.',
        success: true
      });
    } else {
      res.status(500).json({
        message: 'Failed to cancel account deletion. Please try again later.',
        success: false
      });
    }
  } catch (error) {
    logger.error('Error cancelling scheduled deletion:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
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
