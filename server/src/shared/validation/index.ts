/**
 * Validation - Central Export
 * 
 * All validation middleware, schemas, and utilities
 */

// Middleware
export {
    validate,
    validateMultiple,
    validateWithCustomErrors,
    type ValidationTarget,
    type ValidationOptions,
} from '../middleware/validation.middleware';

// Sanitization
export {
    stripHtml,
    encodeSpecialChars,
    normalizeWhitespace,
    removeNullBytes,
    sanitizeSql,
    sanitizeNoSql,
    sanitizePath,
    sanitizeInput,
    sanitizeObject,
} from '../utils/sanitize';

// Common Schemas
export * from './schemas/common.schemas';

// Example Schemas (for reference)
export * from './schemas/example.schemas';
