import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../middleware/auth/auth';
import User from '../../../../infrastructure/database/mongoose/models/User';
import { requestEmailChange, verifyEmailChange, cancelEmailChange } from '../../../../core/application/services/user/emailChange.service';
import { createAuditLog } from '../../middleware/system/auditLog';
import logger from '../../../../shared/logger/winston.logger';
import { sendSuccess, sendError, sendValidationError } from '../../../../shared/utils/responseHelper';

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

export const requestEmailChangeHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    const validation = requestEmailChangeSchema.safeParse(req.body);
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

    if (user.email === validation.data.newEmail) {
      sendError(res, 'New email address is the same as your current email', 400, 'SAME_EMAIL');
      return;
    }

    const result = await requestEmailChange(req.user._id, user.email, validation.data.newEmail, req);

    if (result.success) {
      sendSuccess(res, { success: true }, 'Verification email sent to your new email address. Please check your inbox.');
    } else {
      sendError(res, result.message, 400, 'EMAIL_CHANGE_FAILED');
    }
  } catch (error) {
    logger.error('Error requesting email change:', error);
    next(error);
  }
};

export const verifyEmailChangeHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validation = verifyEmailChangeSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      sendValidationError(res, errors);
      return;
    }

    const result = await verifyEmailChange(validation.data.token, req);

    if (result.success) {
      sendSuccess(res, { email: result.email, success: true }, 'Email address updated successfully');
    } else {
      sendError(res, result.message, 400, 'VERIFICATION_FAILED');
    }
  } catch (error) {
    logger.error('Error verifying email change:', error);
    next(error);
  }
};

export const cancelEmailChangeHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    const validation = cancelEmailChangeSchema.safeParse(req.body);
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

    if (!user.pendingEmailChange) {
      sendError(res, 'No pending email change found', 400, 'NO_PENDING_CHANGE');
      return;
    }

    const result = await cancelEmailChange(req.user._id, req);

    if (result.success) {
      sendSuccess(res, { success: true }, 'Email change request cancelled successfully');
    } else {
      sendError(res, result.message, 400, 'CANCEL_FAILED');
    }
  } catch (error) {
    logger.error('Error cancelling email change:', error);
    next(error);
  }
};

export const getEmailChangeStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

    if (!user.pendingEmailChange) {
      sendSuccess(res, { hasPendingChange: false }, 'No pending email change');
      return;
    }

    sendSuccess(res, {
      hasPendingChange: true,
      newEmail: user.pendingEmailChange.email,
      requestedAt: user.pendingEmailChange.tokenExpiry
        ? new Date(user.pendingEmailChange.tokenExpiry.getTime() - (24 * 60 * 60 * 1000))
        : undefined,
      expiresAt: user.pendingEmailChange.tokenExpiry
    }, 'Email change status retrieved successfully');
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
