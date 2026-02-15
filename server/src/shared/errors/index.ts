/**
 * Error Module Exports
 * Central export point for all error-related utilities
 */

// Error codes
export { ErrorCode, errorStatusMap } from './errorCodes';

// Error classes
export {
AppError, AuthenticationError,
AuthorizationError, ConflictError, DatabaseError, ExternalServiceError, NotFoundError, RateLimitError, ValidationError, isOperationalError,
normalizeError
} from './app.error';

// Legacy error utilities (for backward compatibility)
export {
authErrorMessages, extractErrorCode,
formatError, getErrorMessage, kycErrorMessages
} from './error-messages';

// Types
export { createAppError } from './types';
