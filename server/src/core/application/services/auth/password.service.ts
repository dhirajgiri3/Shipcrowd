/**
 * Password
 * 
 * Purpose: Minimum requirements for password strength
 * 
 * DEPENDENCIES:
 * - None specified
 * 
 * TESTING:
 * Unit Tests: tests/unit/services/.../{filename}.test.ts
 * Coverage: TBD
 * 
 * NOTE: This service needs comprehensive documentation.
 * See SERVICE_TEMPLATE.md for documentation standards.
 */

import zxcvbn from 'zxcvbn';

export interface PasswordStrength {
  score: number;
  feedback: {
    warning: string;
    suggestions: string[];
  };
  isStrong: boolean;
}

/**
 * Minimum requirements for password strength
 */
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  minScore: 2, // 0-4 scale from zxcvbn
  requireLowercase: true,
  requireUppercase: true,
  requireNumber: true,
  requireSpecial: true,
};

/**
 * Check if a password meets the minimum requirements
 */
export const meetsMinimumRequirements = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check length
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
  }

  // Check for lowercase letters
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for uppercase letters
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for numbers
  if (PASSWORD_REQUIREMENTS.requireNumber && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Check for special characters
  if (PASSWORD_REQUIREMENTS.requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Evaluate password strength using zxcvbn
 * @param password The password to evaluate
 * @param userInputs Additional user inputs to check against (e.g., email, name)
 * @returns Password strength evaluation
 */
export const evaluatePasswordStrength = (
  password: string,
  userInputs: string[] = []
): PasswordStrength => {
  // Check minimum requirements first
  const requirements = meetsMinimumRequirements(password);
  
  // Evaluate password strength
  const result = zxcvbn(password, userInputs);
  
  // Combine feedback from both checks
  const feedback = {
    warning: result.feedback.warning || '',
    suggestions: [
      ...requirements.errors,
      ...result.feedback.suggestions,
    ],
  };

  // Password is strong if it meets minimum requirements and has a score >= minScore
  const isStrong = requirements.valid && result.score >= PASSWORD_REQUIREMENTS.minScore;

  return {
    score: result.score,
    feedback,
    isStrong,
  };
};

/**
 * Get a human-readable description of password strength
 */
export const getPasswordStrengthLabel = (score: number): string => {
  switch (score) {
    case 0:
      return 'Very Weak';
    case 1:
      return 'Weak';
    case 2:
      return 'Fair';
    case 3:
      return 'Good';
    case 4:
      return 'Strong';
    default:
      return 'Unknown';
  }
};

export default {
  evaluatePasswordStrength,
  meetsMinimumRequirements,
  getPasswordStrengthLabel,
  PASSWORD_REQUIREMENTS,
};
