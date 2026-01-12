/**
 * Validation Error Messages
 * Supports dynamic field names and values for flexibility
 * 
 * Use functions for messages that need dynamic content
 */

export const VALIDATION_MESSAGES = {
    // Generic Validation
    REQUIRED_FIELD: (field: string) => `${field} is required.`,
    INVALID_FORMAT: (field: string) => `${field} format is invalid.`,
    INVALID_VALUE: (field: string) => `Invalid value for ${field}.`,

    // Specific Fields
    INVALID_EMAIL: 'Please enter a valid email address.',
    INVALID_PHONE: 'Please enter a valid 10-digit phone number.',
    INVALID_URL: 'Please enter a valid URL.',
    INVALID_DATE: 'Please enter a valid date.',
    INVALID_OBJECT_ID: (resource: string) => `Invalid ${resource} ID format.`,

    // Indian Document Validation
    INVALID_PAN: 'Invalid PAN format. Please enter a valid 10-character PAN (e.g., ABCDE1234F).',
    INVALID_GSTIN: 'Invalid GSTIN format. Please enter a valid 15-character GSTIN.',
    INVALID_AADHAAR: 'Invalid Aadhaar format. Please enter a valid 12-digit Aadhaar number.',
    INVALID_IFSC: 'Invalid IFSC code format. IFSC should be in the format AAAA0XXXXXX.',

    // Length Validation
    MIN_LENGTH: (field: string, min: number) => `${field} must be at least ${min} characters.`,
    MAX_LENGTH: (field: string, max: number) => `${field} must not exceed ${max} characters.`,
    EXACT_LENGTH: (field: string, length: number) => `${field} must be exactly ${length} characters.`,

    // Number Validation
    MIN_VALUE: (field: string, min: number) => `${field} must be at least ${min}.`,
    MAX_VALUE: (field: string, max: number) => `${field} must not exceed ${max}.`,
    POSITIVE_NUMBER: (field: string) => `${field} must be a positive number.`,
    INTEGER_REQUIRED: (field: string) => `${field} must be a whole number.`,

    // Array Validation
    ARRAY_MIN_LENGTH: (field: string, min: number) => `${field} must contain at least ${min} item(s).`,
    ARRAY_MAX_LENGTH: (field: string, max: number) => `${field} must not contain more than ${max} item(s).`,
    ARRAY_EMPTY: (field: string) => `${field} cannot be empty.`,

    // File Validation
    FILE_TOO_LARGE: (maxSize: string) => `File size exceeds the maximum limit of ${maxSize}.`,
    INVALID_FILE_TYPE: (allowedTypes: string) => `Invalid file type. Allowed types: ${allowedTypes}.`,
    FILE_REQUIRED: 'Please upload a file.',

    // Password Validation
    PASSWORD_WEAK: 'Password must be at least 8 characters with uppercase, lowercase, and numbers.',
    PASSWORD_MISMATCH: 'Passwords do not match.',

    // Date Validation
    DATE_IN_PAST: (field: string) => `${field} must be in the past.`,
    DATE_IN_FUTURE: (field: string) => `${field} must be in the future.`,
    DATE_RANGE_INVALID: 'Start date must be before end date.',
} as const;
