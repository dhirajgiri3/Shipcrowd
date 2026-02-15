import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { cancelEmailChange, requestEmailChange, verifyEmailChange } from '../../../../core/application/services/user/email-change.service';
import { User } from '../../../../infrastructure/database/mongoose/models';
import { AuthenticationError, NotFoundError, ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import logger from '../../../../shared/logger/winston.logger';
import { sendSuccess } from '../../../../shared/utils/responseHelper';

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

export const requestEmailChangeHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    const validation = requestEmailChangeSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError('Validation failed', validation.error.errors);
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      throw new NotFoundError('User', ErrorCode.RES_USER_NOT_FOUND);
    }

    const isPasswordValid = await user.comparePassword(validation.data.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid password', ErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    if (user.email === validation.data.newEmail) {
      throw new ValidationError('New email address is the same as your current email');
    }

    const result = await requestEmailChange(req.user._id, user.email, validation.data.newEmail, req);

    if (result.success) {
      sendSuccess(res, { success: true }, 'Verification email sent to your new email address. Please check your inbox.');
    } else {
      throw new ValidationError(result.message);
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
      throw new ValidationError('Validation failed', validation.error.errors);
    }

    const result = await verifyEmailChange(validation.data.token, req);

    if (result.success) {
      sendSuccess(res, { email: result.email, success: true }, 'Email address updated successfully');
    } else {
      throw new ValidationError(result.message);
    }
  } catch (error) {
    logger.error('Error verifying email change:', error);
    next(error);
  }
};

export const cancelEmailChangeHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    const validation = cancelEmailChangeSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError('Validation failed', validation.error.errors);
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      throw new NotFoundError('User', ErrorCode.RES_USER_NOT_FOUND);
    }

    const isPasswordValid = await user.comparePassword(validation.data.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid password', ErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    if (!user.pendingEmailChange) {
      throw new ValidationError('No pending email change found');
    }

    const result = await cancelEmailChange(req.user._id, req);

    if (result.success) {
      sendSuccess(res, { success: true }, 'Email change request cancelled successfully');
    } else {
      throw new ValidationError(result.message);
    }
  } catch (error) {
    logger.error('Error cancelling email change:', error);
    next(error);
  }
};

export const getEmailChangeStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    const user = await User.findById(req.user._id).lean();
    if (!user) {
      throw new NotFoundError('User', ErrorCode.RES_USER_NOT_FOUND);
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
