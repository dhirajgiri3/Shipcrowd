import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import User from '../../../infrastructure/database/mongoose/models/User';
import {
  updateProfileCompletionStatus,
  getProfileCompletionSuggestions
} from '../../../core/application/services/user/profile.service';
import { createAuditLog } from '../middleware/auditLog';
import logger from '../../../shared/logger/winston.logger';

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
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    let user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
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
        res.status(404).json({ message: 'User not found' });
        return;
      }
      user = updatedUser;
    }

    // Get suggestions for profile completion
    const suggestions = await getProfileCompletionSuggestions(user._id as string);

    res.json({
      completion: user.profileCompletion,
      suggestions,
    });
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
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const validatedData = basicProfileSchema.parse(req.body);

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Update user name if provided
    if (validatedData.name !== undefined) {
      user.name = validatedData.name;
    }

    // Update profile fields
    user.profile = {
      ...user.profile,
      phone: validatedData.phone ?? user.profile?.phone,
      avatar: validatedData.avatar ?? user.profile?.avatar,
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
        fields: Object.keys(validatedData),
      },
      req
    );

    res.json({
      message: 'Basic profile information updated successfully',
      user: {
        name: user.name,
        profile: {
          phone: user.profile?.phone,
          avatar: user.profile?.avatar,
        },
      },
    });
  } catch (error) {
    logger.error('Error updating basic profile:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
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
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const validatedData = addressProfileSchema.parse(req.body);

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Update profile fields
    user.profile = {
      ...user.profile,
      address: validatedData.address ?? user.profile?.address,
      city: validatedData.city ?? user.profile?.city,
      state: validatedData.state ?? user.profile?.state,
      country: validatedData.country ?? user.profile?.country,
      postalCode: validatedData.postalCode ?? user.profile?.postalCode,
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
        fields: Object.keys(validatedData),
      },
      req
    );

    res.json({
      message: 'Address information updated successfully',
      profile: {
        address: user.profile?.address,
        city: user.profile?.city,
        state: user.profile?.state,
        country: user.profile?.country,
        postalCode: user.profile?.postalCode,
      },
    });
  } catch (error) {
    logger.error('Error updating address profile:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
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
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const validatedData = personalProfileSchema.parse(req.body);

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Update profile fields
    user.profile = {
      ...user.profile,
      dateOfBirth: validatedData.dateOfBirth ?? user.profile?.dateOfBirth,
      gender: validatedData.gender ?? user.profile?.gender,
      bio: validatedData.bio ?? user.profile?.bio,
      website: validatedData.website ?? user.profile?.website,
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
        fields: Object.keys(validatedData),
      },
      req
    );

    res.json({
      message: 'Personal information updated successfully',
      profile: {
        dateOfBirth: user.profile?.dateOfBirth,
        gender: user.profile?.gender,
        bio: user.profile?.bio,
        website: user.profile?.website,
      },
    });
  } catch (error) {
    logger.error('Error updating personal profile:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
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
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const validatedData = socialProfileSchema.parse(req.body);

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Update social links
    user.profile = {
      ...user.profile,
      socialLinks: {
        facebook: validatedData.facebook ?? user.profile?.socialLinks?.facebook,
        twitter: validatedData.twitter ?? user.profile?.socialLinks?.twitter,
        linkedin: validatedData.linkedin ?? user.profile?.socialLinks?.linkedin,
        instagram: validatedData.instagram ?? user.profile?.socialLinks?.instagram,
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
        fields: Object.keys(validatedData),
      },
      req
    );

    res.json({
      message: 'Social links updated successfully',
      socialLinks: user.profile?.socialLinks,
    });
  } catch (error) {
    logger.error('Error updating social profile:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
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
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const validatedData = preferencesProfileSchema.parse(req.body);

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Update preferences
    user.profile = {
      ...user.profile,
      preferredLanguage: validatedData.preferredLanguage ?? user.profile?.preferredLanguage,
      preferredCurrency: validatedData.preferredCurrency ?? user.profile?.preferredCurrency,
      timezone: validatedData.timezone ?? user.profile?.timezone,
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
        fields: Object.keys(validatedData),
      },
      req
    );

    res.json({
      message: 'Preferences updated successfully',
      preferences: {
        preferredLanguage: user.profile?.preferredLanguage,
        preferredCurrency: user.profile?.preferredCurrency,
        timezone: user.profile?.timezone,
      },
    });
  } catch (error) {
    logger.error('Error updating preferences:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
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
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    let user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // If profile completion doesn't exist, update it
    if (!user.profileCompletion) {
      await updateProfileCompletionStatus(user._id as string);
      // Refresh user data
      const updatedUser = await User.findById(req.user._id);
      if (!updatedUser) {
        res.status(404).json({ message: 'User not found' });
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
      res.json({
        showPrompt: false,
      });
      return;
    }

    // Get suggestions for profile completion
    const suggestions = await getProfileCompletionSuggestions(user._id as string);

    // Filter to high importance suggestions for prompts
    const highImportanceSuggestions = suggestions.filter(s => s.importance === 'high');

    res.json({
      showPrompt: true,
      completion: user.profileCompletion?.status || 0,
      requiredFieldsCompleted: user.profileCompletion?.requiredFieldsCompleted || false,
      suggestions: highImportanceSuggestions.length > 0 ? highImportanceSuggestions : suggestions.slice(0, 3),
    });
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
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
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

    res.json({
      message: 'Profile prompt dismissed',
      nextPromptDate,
    });
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
