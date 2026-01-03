import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../middleware/auth/auth';
import User from '../../../../infrastructure/database/mongoose/models/user.model';
import {
  updateProfileCompletionStatus,
  getProfileCompletionSuggestions
} from '../../../../core/application/services/user/profile.service';
import { createAuditLog } from '../../middleware/system/auditLog';
import logger from '../../../../shared/logger/winston.logger';
import {
  sendSuccess,
  sendError,
  sendValidationError
} from '../../../../shared/utils/responseHelper';

// Define validation schemas for different profile sections
const basicProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  phone: z.string().optional().nullable(),
  avatar: z.string().url('Invalid URL format').optional().nullable(),
});

const addressProfileSchema = z.object({
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
});

const personalProfileSchema = z.object({
  dateOfBirth: z.string().optional().nullable().transform(val => val ? new Date(val) : null),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional().nullable(),
  bio: z.string().optional().nullable(),
  website: z.string().url('Invalid URL format').optional().nullable(),
});

const socialProfileSchema = z.object({
  facebook: z.string().url('Invalid URL format').optional().nullable(),
  twitter: z.string().url('Invalid URL format').optional().nullable(),
  linkedin: z.string().url('Invalid URL format').optional().nullable(),
  instagram: z.string().url('Invalid URL format').optional().nullable(),
});

const preferencesProfileSchema = z.object({
  preferredLanguage: z.string().optional().nullable(),
  preferredCurrency: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
});

/**
 * Get profile completion status
 * @route GET /profile/completion
 */
export const getProfileCompletion = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    let user = await User.findById(req.user._id);
    if (!user) {
      sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
      return;
    }

    // If profile completion status doesn't exist or is outdated, update it
    if (!user.profileCompletion ||
      !user.profileCompletion.lastUpdated ||
      Date.now() - user.profileCompletion.lastUpdated.getTime() > 24 * 60 * 60 * 1000) { // 24 hours
      await updateProfileCompletionStatus(user._id as string);
      // Refresh user data
      const updatedUser = await User.findById(req.user._id);
      if (!updatedUser) {
        sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
        return;
      }
      user = updatedUser;
    }

    // Get suggestions for profile completion
    const suggestions = await getProfileCompletionSuggestions(user._id as string);

    sendSuccess(res, {
      completion: user.profileCompletion,
      suggestions,
    }, 'Profile completion status retrieved successfully');
  } catch (error) {
    logger.error('Error getting profile completion:', error);
    next(error);
  }
};

/**
 * Update basic profile information
 * @route PATCH /profile/basic
 */
export const updateBasicProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    const validation = basicProfileSchema.safeParse(req.body);
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

    // Update user name if provided
    if (validation.data.name !== undefined) {
      user.name = validation.data.name;
    }

    // Update profile fields
    user.profile = {
      ...user.profile,
      phone: validation.data.phone ?? user.profile?.phone,
      avatar: validation.data.avatar ?? user.profile?.avatar,
    };

    await user.save();

    // Update profile completion status
    await updateProfileCompletionStatus(user._id as string);

    // Log the action
    await createAuditLog(
      req.user._id,
      req.user.companyId,
      'profile_update',
      'user',
      req.user._id as string,
      {
        message: 'Basic profile information updated',
        fields: Object.keys(validation.data),
      },
      req
    );

    sendSuccess(res, {
      user: {
        name: user.name,
        profile: {
          phone: user.profile?.phone,
          avatar: user.profile?.avatar,
        },
      },
    }, 'Basic profile information updated successfully');
  } catch (error) {
    logger.error('Error updating basic profile:', error);
    next(error);
  }
};

/**
 * Update address information
 * @route PATCH /profile/address
 */
export const updateAddressProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    const validation = addressProfileSchema.safeParse(req.body);
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

    // Update profile fields
    user.profile = {
      ...user.profile,
      address: validation.data.address ?? user.profile?.address,
      city: validation.data.city ?? user.profile?.city,
      state: validation.data.state ?? user.profile?.state,
      country: validation.data.country ?? user.profile?.country,
      postalCode: validation.data.postalCode ?? user.profile?.postalCode,
    };

    await user.save();

    // Update profile completion status
    await updateProfileCompletionStatus(user._id as string);

    // Log the action
    await createAuditLog(
      req.user._id,
      req.user.companyId,
      'profile_update',
      'user',
      req.user._id as string,
      {
        message: 'Address information updated',
        fields: Object.keys(validation.data),
      },
      req
    );

    sendSuccess(res, {
      profile: {
        address: user.profile?.address,
        city: user.profile?.city,
        state: user.profile?.state,
        country: user.profile?.country,
        postalCode: user.profile?.postalCode,
      },
    }, 'Address information updated successfully');
  } catch (error) {
    logger.error('Error updating address profile:', error);
    next(error);
  }
};

/**
 * Update personal information
 * @route PATCH /profile/personal
 */
export const updatePersonalProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    const validation = personalProfileSchema.safeParse(req.body);
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

    // Update profile fields
    user.profile = {
      ...user.profile,
      dateOfBirth: validation.data.dateOfBirth ?? user.profile?.dateOfBirth,
      gender: validation.data.gender ?? user.profile?.gender,
      bio: validation.data.bio ?? user.profile?.bio,
      website: validation.data.website ?? user.profile?.website,
    };

    await user.save();

    // Update profile completion status
    await updateProfileCompletionStatus(user._id as string);

    // Log the action
    await createAuditLog(
      req.user._id,
      req.user.companyId,
      'profile_update',
      'user',
      req.user._id as string,
      {
        message: 'Personal information updated',
        fields: Object.keys(validation.data),
      },
      req
    );

    sendSuccess(res, {
      profile: {
        dateOfBirth: user.profile?.dateOfBirth,
        gender: user.profile?.gender,
        bio: user.profile?.bio,
        website: user.profile?.website,
      },
    }, 'Personal information updated successfully');
  } catch (error) {
    logger.error('Error updating personal profile:', error);
    next(error);
  }
};

/**
 * Update social links
 * @route PATCH /profile/social
 */
export const updateSocialProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    const validation = socialProfileSchema.safeParse(req.body);
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

    // Update social links
    user.profile = {
      ...user.profile,
      socialLinks: {
        facebook: validation.data.facebook ?? user.profile?.socialLinks?.facebook,
        twitter: validation.data.twitter ?? user.profile?.socialLinks?.twitter,
        linkedin: validation.data.linkedin ?? user.profile?.socialLinks?.linkedin,
        instagram: validation.data.instagram ?? user.profile?.socialLinks?.instagram,
      },
    };

    await user.save();

    // Update profile completion status
    await updateProfileCompletionStatus(user._id as string);

    // Log the action
    await createAuditLog(
      req.user._id,
      req.user.companyId,
      'profile_update',
      'user',
      req.user._id as string,
      {
        message: 'Social links updated',
        fields: Object.keys(validation.data),
      },
      req
    );

    sendSuccess(res, {
      socialLinks: user.profile?.socialLinks,
    }, 'Social links updated successfully');
  } catch (error) {
    logger.error('Error updating social profile:', error);
    next(error);
  }
};

/**
 * Update preferences
 * @route PATCH /profile/preferences
 */
export const updatePreferencesProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    const validation = preferencesProfileSchema.safeParse(req.body);
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

    // Update preferences
    user.profile = {
      ...user.profile,
      preferredLanguage: validation.data.preferredLanguage ?? user.profile?.preferredLanguage,
      preferredCurrency: validation.data.preferredCurrency ?? user.profile?.preferredCurrency,
      timezone: validation.data.timezone ?? user.profile?.timezone,
    };

    await user.save();

    // Update profile completion status
    await updateProfileCompletionStatus(user._id as string);

    // Log the action
    await createAuditLog(
      req.user._id,
      req.user.companyId,
      'profile_update',
      'user',
      req.user._id as string,
      {
        message: 'Preferences updated',
        fields: Object.keys(validation.data),
      },
      req
    );

    sendSuccess(res, {
      preferences: {
        preferredLanguage: user.profile?.preferredLanguage,
        preferredCurrency: user.profile?.preferredCurrency,
        timezone: user.profile?.timezone,
      },
    }, 'Preferences updated successfully');
  } catch (error) {
    logger.error('Error updating preferences:', error);
    next(error);
  }
};

/**
 * Get profile completion prompts
 * @route GET /profile/prompts
 */
export const getProfilePrompts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    let user = await User.findById(req.user._id);
    if (!user) {
      sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
      return;
    }

    // If profile completion doesn't exist, update it
    if (!user.profileCompletion) {
      await updateProfileCompletionStatus(user._id as string);
      // Refresh user data
      const updatedUser = await User.findById(req.user._id);
      if (!updatedUser) {
        sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
        return;
      }
      user = updatedUser;
    }

    // Check if we should show prompts
    const shouldPrompt = user.profileCompletion &&
      (!user.profileCompletion.requiredFieldsCompleted ||
        (user.profileCompletion.nextPromptDate &&
          user.profileCompletion.nextPromptDate <= new Date()));

    if (!shouldPrompt) {
      sendSuccess(res, { showPrompt: false }, 'No profile prompts at this time');
      return;
    }

    // Get suggestions for profile completion
    const suggestions = await getProfileCompletionSuggestions(user._id as string);

    // Filter to high importance suggestions for prompts
    const highImportanceSuggestions = suggestions.filter(s => s.importance === 'high');

    sendSuccess(res, {
      showPrompt: true,
      completion: user.profileCompletion?.status || 0,
      requiredFieldsCompleted: user.profileCompletion?.requiredFieldsCompleted || false,
      suggestions: highImportanceSuggestions.length > 0 ? highImportanceSuggestions : suggestions.slice(0, 3),
    }, 'Profile prompts retrieved successfully');
  } catch (error) {
    logger.error('Error getting profile prompts:', error);
    next(error);
  }
};

/**
 * Dismiss profile completion prompt
 * @route POST /profile/dismiss-prompt
 */
export const dismissProfilePrompt = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
      return;
    }

    // Set next prompt date to 7 days later
    const nextPromptDate = new Date();
    nextPromptDate.setDate(nextPromptDate.getDate() + 7);

    if (!user.profileCompletion) {
      user.profileCompletion = {
        status: 0,
        requiredFieldsCompleted: false,
        lastUpdated: new Date(),
        nextPromptDate,
      };
    } else {
      user.profileCompletion.nextPromptDate = nextPromptDate;
    }

    await user.save();

    sendSuccess(res, { nextPromptDate }, 'Profile prompt dismissed');
  } catch (error) {
    logger.error('Error dismissing profile prompt:', error);
    next(error);
  }
};

const profileController = {
  getProfileCompletion,
  updateBasicProfile,
  updateAddressProfile,
  updatePersonalProfile,
  updateSocialProfile,
  updatePreferencesProfile,
  getProfilePrompts,
  dismissProfilePrompt,
};

export default profileController;
