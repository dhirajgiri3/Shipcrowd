/**
 * Authentication and Authorization Messages
 * Centralized for consistency and easy updates
 * 
 * All messages are user-friendly and provide clear guidance
 */

export const AUTH_MESSAGES = {
    // Authentication
    INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
    EMAIL_NOT_VERIFIED: 'Please verify your email address before logging in. Check your inbox for the verification link.',
    EMAIL_ALREADY_IN_USE: 'This email address is already registered. Please login or use a different email.',
    AUTH_REQUIRED: 'Authentication required. Please login to continue.',

    // Tokens
    TOKEN_EXPIRED: 'Your session has expired. Please login again.',
    TOKEN_INVALID: 'Invalid authentication token. Please login again.',
    REFRESH_TOKEN_INVALID: 'Invalid refresh token. Please login again.',
    TOKEN_MISSING: 'No authentication token provided.',

    // Account Status
    ACCOUNT_DISABLED: 'Your account has been disabled. Please contact support for assistance.',
    ACCOUNT_LOCKED: 'Account temporarily locked due to multiple failed login attempts. Please try again in 30 minutes or reset your password.',
    ACCOUNT_NOT_FOUND: 'No account found with this email address.',

    // Passwords
    PASSWORD_INCORRECT: 'Current password is incorrect.',
    PASSWORD_WEAK: 'Password must be at least 8 characters with uppercase, lowercase, and numbers.',
    PASSWORD_MISMATCH: 'Passwords do not match.',
    PASSWORD_RESET_EXPIRED: 'Password reset link has expired. Please request a new one.',

    // OAuth
    OAUTH_FAILED: 'Authentication with Google failed. Please try again or use email/password.',
    OAUTH_PROFILE_INVALID: 'Unable to retrieve your profile from Google. Please try again.',

    // Invitations
    INVITATION_INVALID: 'This invitation link is invalid or expired. Please request a new invitation.',
    INVITATION_EXPIRED: 'This invitation has expired. Please request a new one.',
    INVITATION_ALREADY_USED: 'This invitation has already been used.',

    // Magic Links
    MAGIC_LINK_EXPIRED: 'This magic link has expired. Please request a new one.',
    MAGIC_LINK_INVALID: 'Invalid magic link. Please request a new one.',
    MAGIC_LINK_ALREADY_USED: 'This magic link has already been used.',

    // Security
    SECURITY_QUESTION_INCORRECT: 'Security answer is incorrect.',
    BACKUP_EMAIL_NOT_SET: 'No backup email configured for account recovery.',
    RECOVERY_KEY_INVALID: 'Invalid recovery key.',
} as const;
