import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import User from '../../../infrastructure/database/mongoose/models/User';
import { requestEmailChange, verifyEmailChange, cancelEmailChange } from '../../../core/application/services/user/emailChange.service';
import { createAuditLog } from '../middleware/auditLog';
import logger from '../../../shared/logger/winston.logger';

// Define validation schemas
const requestEmailChangeSchema = z.object({
  newEmail: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const verifyEmailChangeSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

const cancelEmailChangeSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

/**
 * Request email change
 * @route POST /email/change
 */
export const requestEmailChangeHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = requestEmailChangeSchema.parse(req.body);

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

    // Check if new email is the same as current email
    if (user.email === validatedData.newEmail) {
      res.status(400).json({
        message: 'New email address is the same as your current email',
        success: false
      });
      return;
    }

    // Request email change
    const result = await requestEmailChange(
      req.user._id,
      user.email,
      validatedData.newEmail,
      req
    );

    if (result.success) {
      res.json({
        message: 'Verification email sent to your new email address. Please check your inbox.',
        success: true
      });
    } else {
      res.status(400).json({
        message: result.message,
        success: false
      });
    }
  } catch (error) {
    logger.error('Error requesting email change:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    next(error);
  }
};

/**
 * Verify email change
 * @route POST /email/verify
 */
export const verifyEmailChangeHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = verifyEmailChangeSchema.parse(req.body);

    // Verify email change
    const result = await verifyEmailChange(validatedData.token, req);

    if (result.success) {
      res.json({
        message: 'Email address updated successfully',
        email: result.email,
        success: true
      });
    } else {
      res.status(400).json({
        message: result.message,
        success: false
      });
    }
  } catch (error) {
    logger.error('Error verifying email change:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    next(error);
  }
};

/**
 * Cancel email change
 * @route POST /email/cancel-change
 */
export const cancelEmailChangeHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = cancelEmailChangeSchema.parse(req.body);

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

    // Check if there's a pending email change
    if (!user.pendingEmailChange) {
      res.status(400).json({
        message: 'No pending email change found',
        success: false
      });
      return;
    }

    // Cancel email change
    const result = await cancelEmailChange(req.user._id, req);

    if (result.success) {
      res.json({
        message: 'Email change request cancelled successfully',
        success: true
      });
    } else {
      res.status(400).json({
        message: result.message,
        success: false
      });
    }
  } catch (error) {
    logger.error('Error cancelling email change:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    next(error);
  }
};

/**
 * Get pending email change status
 * @route GET /email/change-status
 */
export const getEmailChangeStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (!user.pendingEmailChange) {
      res.json({
        hasPendingChange: false
      });
      return;
    }

    res.json({
      hasPendingChange: true,
      newEmail: user.pendingEmailChange.email,
      requestedAt: user.pendingEmailChange.tokenExpiry
        ? new Date(user.pendingEmailChange.tokenExpiry.getTime() - (24 * 60 * 60 * 1000)) // 24 hours before expiry
        : undefined,
      expiresAt: user.pendingEmailChange.tokenExpiry
    });
  } catch (error) {
    logger.error('Error getting email change status:', error);
    next(error);
  }
};

const emailController = {
  requestEmailChangeHandler,
  verifyEmailChangeHandler,
  cancelEmailChangeHandler,
  getEmailChangeStatus,
};

export default emailController;
