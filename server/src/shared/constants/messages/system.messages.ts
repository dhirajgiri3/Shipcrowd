/**
 * System and Technical Error Messages
 * Infrastructure and system-level error messages
 */

export const SYSTEM_MESSAGES = {
    // Internal Errors
    INTERNAL_ERROR: 'An unexpected error occurred. Please try again later.',
    DATABASE_ERROR: 'Database operation failed. Please try again.',
    CONFIGURATION_ERROR: 'System configuration error. Please contact support.',

    // External Services
    EXTERNAL_SERVICE_ERROR: (service: string) =>
        `${service} service is currently unavailable. Please try again later.`,
    PAYMENT_GATEWAY_ERROR: 'Payment processing failed. Please try again.',
    COURIER_API_ERROR: 'Courier service unavailable. Please try again later.',
    SMS_SERVICE_ERROR: 'SMS service unavailable. Message could not be sent.',
    EMAIL_SERVICE_ERROR: 'Email service unavailable. Email could not be sent.',

    // Rate Limiting
    RATE_LIMIT_EXCEEDED: (retryAfter?: number) =>
        `Too many requests. Please try again${retryAfter ? ` in ${retryAfter} seconds` : ' later'}.`,
    RATE_LIMIT_AUTH: 'Too many login attempts. Please try again in 15 minutes.',

    // File Operations
    FILE_UPLOAD_ERROR: 'File upload failed. Please check the file format and try again.',
    CSV_PARSE_ERROR: 'Failed to parse CSV file. Please check the file format.',
    FILE_NOT_FOUND: 'Requested file not found.',
    FILE_DOWNLOAD_ERROR: 'File download failed. Please try again.',

    // Network
    NETWORK_ERROR: 'Network error. Please check your internet connection and try again.',
    TIMEOUT: 'Request timed out. Please try again.',
    SERVICE_UNAVAILABLE: 'Service temporarily unavailable. Please try again later.',

    // Maintenance
    MAINTENANCE_MODE: 'System is currently under maintenance. Please try again later.',
    FEATURE_DISABLED: (feature: string) => `${feature} is currently disabled.`,
} as const;
