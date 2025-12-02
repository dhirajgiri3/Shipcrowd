import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import User from '../models/User';
import AuditLog from '../models/AuditLog';
import { AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';
import { createAuditLog } from '../middleware/auditLog';

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
  newPassword: z.string().min(8),
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
    // Cast to AuthRequest to access user property
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // Fetch the complete user data from the database
    const user = await User.findById(authReq.user._id).select('-password');

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ user });
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
    // Cast to AuthRequest to access user property
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const validatedData = updateProfileSchema.parse(req.body);

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      authReq.user._id,
      { $set: validatedData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      res.status(404).json({ message: 'User not found' });
      return;
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

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    logger.error('Error updating profile:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    next(error);
  }
};

/**
 * Update the current user's password
 * @route PATCH /users/profile/password
 */
export const updatePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Cast to AuthRequest to access user property
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const validatedData = updatePasswordSchema.parse(req.body);

    // Get user with password
    const user = await User.findById(authReq.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(validatedData.currentPassword);
    if (!isPasswordValid) {
      res.status(400).json({ message: 'Current password is incorrect' });
      return;
    }

    // Update password
    user.password = validatedData.newPassword;
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

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    logger.error('Error updating password:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    next(error);
  }
};

/**
 * Get the current user's activity log
 * @route GET /users/profile/activity
 */
export const getActivityLog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Cast to AuthRequest to access user property
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get audit logs for the user
    const logs = await AuditLog.find({ userId: authReq.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await AuditLog.countDocuments({ userId: authReq.user._id });

    res.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
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
