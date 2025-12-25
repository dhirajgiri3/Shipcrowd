/**
 * Security constants for the application
 */

// List of security questions for users to choose from
export const SECURITY_QUESTIONS = [
    'What was the name of your first pet?',
    'What was the name of your first school?',
    'In what city were you born?',
    'What is your mother\'s maiden name?',
    'What was the make of your first car?',
    'What is the name of your favorite childhood teacher?',
    'What is your favorite movie?',
    'What street did you grow up on?',
    'What was your childhood nickname?',
    'What is the name of your favorite childhood friend?',
];

// Token expiration times (in seconds)
export const TOKEN_EXPIRY = {
    ACCESS_TOKEN: 15 * 60, // 15 minutes
    REFRESH_TOKEN: 7 * 24 * 60 * 60, // 7 days
    EMAIL_VERIFICATION: 24 * 60 * 60, // 24 hours
    PASSWORD_RESET: 1 * 60 * 60, // 1 hour
    TEAM_INVITATION: 7 * 24 * 60 * 60, // 7 days
};

// Password requirements
export const PASSWORD_REQUIREMENTS = {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: true,
};
