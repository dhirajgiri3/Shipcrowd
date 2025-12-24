/**
 * Error Module Exports
 * Central export point for all error-related utilities
 */

// Error codes
export { ErrorCode, errorStatusMap } from './errorCodes';

// Error classes
export {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    ExternalServiceError,
    DatabaseError,
    isOperationalError,
    normalizeError,
} from './AppError';

// Legacy error utilities (for backward compatibility)
export {
    authErrorMessages,
    kycErrorMessages,
    getErrorMessage,
    extractErrorCode,
    formatError,
} from './error-messages';

// Types
export { createAppError } from './types';
