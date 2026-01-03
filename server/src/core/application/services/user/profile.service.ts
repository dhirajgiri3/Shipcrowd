import mongoose from 'mongoose';
import User, { IUser } from '../../../../infrastructure/database/mongoose/models/user.model';
import logger from '../../../../shared/logger/winston.logger';

// Define required fields for different user roles
const REQUIRED_FIELDS = {
  admin: ['name', 'email', 'profile.phone'],
  seller: ['name', 'email', 'profile.phone', 'profile.address', 'profile.city', 'profile.country'],
  staff: ['name', 'email', 'profile.phone'],
};

// Define profile fields and their weights for completion percentage
const PROFILE_FIELDS_WEIGHTS = {
  // Basic info (40%)
  'name': 10,
  'email': 10,
  'profile.phone': 10,
  'profile.avatar': 10,
  
  // Address info (20%)
  'profile.address': 5,
  'profile.city': 5,
  'profile.state': 5,
  'profile.country': 5,
  
  // Additional info (20%)
  'profile.dateOfBirth': 5,
  'profile.gender': 5,
  'profile.bio': 5,
  'profile.website': 5,
  
  // Preferences (10%)
  'profile.preferredLanguage': 3,
  'profile.preferredCurrency': 3,
  'profile.timezone': 4,
  
  // Social links (10%)
  'profile.socialLinks.facebook': 2.5,
  'profile.socialLinks.twitter': 2.5,
  'profile.socialLinks.linkedin': 2.5,
  'profile.socialLinks.instagram': 2.5,
};

/**
 * Calculate profile completion percentage
 * @param user User object
 * @returns Profile completion percentage (0-100)
 */
export const calculateProfileCompletion = (user: IUser): number => {
  let completionScore = 0;
  const totalWeight = Object.values(PROFILE_FIELDS_WEIGHTS).reduce((sum, weight) => sum + weight, 0);

  // Check each field and add its weight to the completion score if it exists
  for (const [field, weight] of Object.entries(PROFILE_FIELDS_WEIGHTS)) {
    const fieldValue = getNestedProperty(user, field);
    if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
      completionScore += weight;
    }
  }

  // Calculate percentage
  return Math.round((completionScore / totalWeight) * 100);
};

/**
 * Check if all required fields are completed
 * @param user User object
 * @returns Boolean indicating if all required fields are completed
 */
export const checkRequiredFieldsCompleted = (user: IUser): boolean => {
  const role = user.role || 'seller'; // Default to seller if role is not defined
  const requiredFields = REQUIRED_FIELDS[role] || REQUIRED_FIELDS.seller;

  // Check if all required fields are completed
  return requiredFields.every(field => {
    const fieldValue = getNestedProperty(user, field);
    return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
  });
};

/**
 * Update profile completion status for a user
 * @param userId User ID
 * @returns Updated user with profile completion status
 */
export const updateProfileCompletionStatus = async (
  userId: string | mongoose.Types.ObjectId
): Promise<IUser | null> => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      logger.error(`User not found: ${userId}`);
      return null;
    }

    // Calculate profile completion percentage
    const completionPercentage = calculateProfileCompletion(user);
    
    // Check if all required fields are completed
    const requiredFieldsCompleted = checkRequiredFieldsCompleted(user);

    // Determine next prompt date (7 days later if not completed)
    const nextPromptDate = !requiredFieldsCompleted ? 
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : // 7 days later
      undefined;

    // Update profile completion status
    user.profileCompletion = {
      status: completionPercentage,
      requiredFieldsCompleted,
      lastUpdated: new Date(),
      nextPromptDate,
    };

    await user.save();
    return user;
  } catch (error) {
    logger.error('Error updating profile completion status:', error);
    return null;
  }
};

/**
 * Get profile completion suggestions for a user
 * @param userId User ID
 * @returns Array of suggestions for profile completion
 */
export const getProfileCompletionSuggestions = async (
  userId: string | mongoose.Types.ObjectId
): Promise<{ field: string; importance: 'high' | 'medium' | 'low'; message: string }[]> => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      logger.error(`User not found: ${userId}`);
      return [];
    }

    const suggestions: { field: string; importance: 'high' | 'medium' | 'low'; message: string }[] = [];
    const role = user.role || 'seller';
    const requiredFields = REQUIRED_FIELDS[role] || REQUIRED_FIELDS.seller;

    // Check required fields first (high importance)
    for (const field of requiredFields) {
      const fieldValue = getNestedProperty(user, field);
      if (!fieldValue) {
        suggestions.push({
          field,
          importance: 'high',
          message: `Please add your ${formatFieldName(field)} to complete your profile.`,
        });
      }
    }

    // Check other fields (medium and low importance)
    for (const [field, weight] of Object.entries(PROFILE_FIELDS_WEIGHTS)) {
      // Skip fields that are already in the required fields list
      if (requiredFields.includes(field)) continue;

      const fieldValue = getNestedProperty(user, field);
      if (!fieldValue) {
        // Determine importance based on weight
        const importance = weight >= 8 ? 'medium' : 'low';
        suggestions.push({
          field,
          importance,
          message: `Consider adding your ${formatFieldName(field)} to enhance your profile.`,
        });
      }
    }

    return suggestions;
  } catch (error) {
    logger.error('Error getting profile completion suggestions:', error);
    return [];
  }
};

/**
 * Helper function to get nested property from an object
 */
function getNestedProperty(obj: any, path: string): any {
  return path.split('.').reduce((prev, curr) => {
    return prev && prev[curr] !== undefined ? prev[curr] : undefined;
  }, obj);
}

/**
 * Helper function to format field name for display
 */
function formatFieldName(field: string): string {
  const parts = field.split('.');
  const lastPart = parts[parts.length - 1];
  
  // Convert camelCase to spaces
  return lastPart
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

export default {
  calculateProfileCompletion,
  checkRequiredFieldsCompleted,
  updateProfileCompletionStatus,
  getProfileCompletionSuggestions,
};
