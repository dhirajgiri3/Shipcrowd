import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AuditLog, User } from '../../../../infrastructure/database/mongoose/models';
import { AuthenticationError, NotFoundError, ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import logger from '../../../../shared/logger/winston.logger';
import {
calculatePagination,
sendPaginated,
sendSuccess
} from '../../../../shared/utils/responseHelper';
import { passwordSchema } from '../../../../shared/validation/commonSchemas';
import { createAuditLog } from '../../middleware/system/audit-log.middleware';

// Define validation schemas
const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  profile: z.object({
    phone: z.string().optional(),
    avatar: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
  }).optional(),
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(8),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

/**
 * Get the current user's profile
 * @route GET /users/profile
 */
export const getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as Request;

    if (!authReq.user) {
      throw new AuthenticationError('Authentication required');
    }

    // Fetch the complete user data from the database
    const user = await User.findById(authReq.user._id).select('-password').lean();

    if (!user) {
      throw new NotFoundError('User', ErrorCode.BIZ_NOT_FOUND);
    }

    sendSuccess(res, { user }, 'Profile retrieved successfully');
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    next(error);
  }
};

/**
 * Update the current user's profile
 * @route PATCH /users/profile
 */
export const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as Request;

    if (!authReq.user) {
      throw new AuthenticationError('Authentication required');
    }

    // Validate input
    const validation = updateProfileSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      throw new ValidationError('Validation failed', errors);
    }

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      authReq.user._id,
      { $set: validation.data },
      { new: true, runValidators: true }
    ).select('-password').lean();

    if (!updatedUser) {
      throw new NotFoundError('User', ErrorCode.BIZ_NOT_FOUND);
    }

    await createAuditLog(
      authReq.user._id,
      authReq.user.companyId,
      'update',
      'user',
      authReq.user._id,
      { message: 'Profile updated' },
      req
    );

    sendSuccess(res, { user: updatedUser }, 'Profile updated successfully');
  } catch (error) {
    logger.error('Error updating profile:', error);
    next(error);
  }
};

/**
 * Update the current user's password
 * @route PATCH /users/profile/password
 */
export const updatePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as Request;

    if (!authReq.user) {
      throw new AuthenticationError('Authentication required');
    }

    // Validate input
    const validation = updatePasswordSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      throw new ValidationError('Validation failed', errors);
    }

    // Get user with password
    const user = await User.findById(authReq.user._id);
    if (!user) {
      throw new NotFoundError('User', ErrorCode.BIZ_NOT_FOUND);
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(validation.data.currentPassword);
    if (!isPasswordValid) {
      throw new ValidationError('Current password is incorrect');
    }

    // Update password
    user.password = validation.data.newPassword;
    user.security.tokenVersion = (user.security.tokenVersion || 0) + 1;
    await user.save();

    await createAuditLog(
      authReq.user._id,
      authReq.user.companyId,
      'update',
      'user',
      authReq.user._id,
      { message: 'Password updated' },
      req
    );

    sendSuccess(res, null, 'Password updated successfully');
  } catch (error) {
    logger.error('Error updating password:', error);
    next(error);
  }
};

/**
 * Get the current user's activity log
 * @route GET /users/profile/activity
 */
export const getActivityLog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as Request;

    if (!authReq.user) {
      throw new AuthenticationError('Authentication required');
    }

    // Parse pagination parameters
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    // Get audit logs for the user
    const [logs, total] = await Promise.all([
      AuditLog.find({ userId: authReq.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments({ userId: authReq.user._id })
    ]);

    const pagination = calculatePagination(total, page, limit);

    sendPaginated(res, logs, pagination, 'Activity log retrieved successfully');
  } catch (error) {
    logger.error('Error fetching activity log:', error);
    next(error);
  }
};

// Define the controller object with explicit types
const userController = {
  getProfile,
  updateProfile,
  updatePassword,
  getActivityLog,
};

export default userController;
