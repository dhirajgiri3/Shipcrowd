/**
 * Custom Error Classes
 * Provides a structured error hierarchy for consistent error handling
 */

import { ErrorCode, errorStatusMap } from './errorCodes';

/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: ErrorCode | string;
    public readonly isOperational: boolean;
    public readonly details?: any;
    public readonly timestamp: Date;

    constructor(
        message: string,
        code: ErrorCode | string = ErrorCode.SYS_INTERNAL_ERROR,
        statusCode?: number,
        isOperational: boolean = true,
        details?: any
    ) {
        super(message);

        this.name = this.constructor.name;
        this.code = code;
        this.statusCode = statusCode || (code in errorStatusMap ? errorStatusMap[code as ErrorCode] : 500);
        this.isOperational = isOperational;
        this.details = details;
        this.timestamp = new Date();

        // Capture stack trace
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Convert error to JSON for API response
     */
    toJSON() {
        return {
            success: false,
            error: {
                code: this.code,
                message: this.message,
                ...(this.details && process.env.NODE_ENV !== 'production' && { details: this.details }),
            },
            timestamp: this.timestamp.toISOString(),
        };
    }
}

/**
 * Validation Error (400)
 * Used for input validation failures
 */
export class ValidationError extends AppError {
    constructor(message: string, details?: any) {
        super(message, ErrorCode.VAL_INVALID_INPUT, 400, true, details);
    }
}

/**
 * Authentication Error (401)
 * Used when authentication fails or is required
 */
export class AuthenticationError extends AppError {
    constructor(
        message: string = 'Authentication required',
        code: ErrorCode = ErrorCode.AUTH_REQUIRED
    ) {
        super(message, code, 401, true);
    }
}

/**
 * Authorization Error (403)
 * Used when user lacks permission for an action
 */
export class AuthorizationError extends AppError {
    constructor(
        message: string = 'Access denied',
        code: ErrorCode = ErrorCode.AUTHZ_FORBIDDEN
    ) {
        super(message, code, 403, true);
    }
}

/**
 * Not Found Error (404)
 * Used when a requested resource doesn't exist
 */
export class NotFoundError extends AppError {
    constructor(
        resource: string = 'Resource',
        code: ErrorCode = ErrorCode.BIZ_NOT_FOUND
    ) {
        super(`${resource} not found`, code, 404, true);
    }
}

/**
 * Conflict Error (409)
 * Used when there's a conflict with existing data
 */
export class ConflictError extends AppError {
    constructor(
        message: string = 'Resource already exists',
        code: ErrorCode = ErrorCode.BIZ_CONFLICT
    ) {
        super(message, code, 409, true);
    }
}

/**
 * Rate Limit Error (429)
 * Used when rate limits are exceeded
 */
export class RateLimitError extends AppError {
    public readonly retryAfter?: number;

    constructor(message: string = 'Too many requests', retryAfter?: number) {
        super(message, ErrorCode.RATE_LIMIT_EXCEEDED, 429, true);
        this.retryAfter = retryAfter;
    }
}

/**
 * External Service Error (502/503)
 * Used when external services fail
 */
export class ExternalServiceError extends AppError {
    public readonly serviceName: string;

    constructor(
        serviceName: string,
        message?: string,
        code: ErrorCode = ErrorCode.EXT_SERVICE_UNAVAILABLE
    ) {
        super(
            message || `${serviceName} service is unavailable`,
            code,
            503,
            true,
            { serviceName }
        );
        this.serviceName = serviceName;
    }
}

/**
 * Database Error (500)
 * Used for database operation failures
 */
export class DatabaseError extends AppError {
    constructor(message: string = 'Database operation failed', details?: any) {
        super(message, ErrorCode.SYS_DATABASE_ERROR, 500, true, details);
    }
}

/**
 * Check if an error is an operational error (expected) vs programmer error (bug)
 */
export const isOperationalError = (error: Error): boolean => {
    if (error instanceof AppError) {
        return error.isOperational;
    }
    return false;
};

/**
 * Create an AppError from any error object
 */
export const normalizeError = (error: any): AppError => {
    if (error instanceof AppError) {
        return error;
    }

    // Handle Mongoose/MongoDB errors
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        if (error.code === 11000) {
            return new ConflictError('Duplicate entry exists', ErrorCode.BIZ_ALREADY_EXISTS);
        }
        return new DatabaseError(error.message);
    }

    // Handle Zod validation errors
    if (error.name === 'ZodError') {
        const details = error.errors?.map((e: any) => ({
            field: e.path?.join('.'),
            message: e.message,
        }));
        return new ValidationError('Validation failed', details);
    }

    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
        return new AuthenticationError('Invalid token', ErrorCode.AUTH_TOKEN_INVALID);
    }
    if (error.name === 'TokenExpiredError') {
        return new AuthenticationError('Token expired', ErrorCode.AUTH_TOKEN_EXPIRED);
    }

    // Default to internal error
    return new AppError(
        error.message || 'An unexpected error occurred',
        ErrorCode.SYS_INTERNAL_ERROR,
        500,
        false, // Programming errors are not operational
        process.env.NODE_ENV !== 'production' ? { originalError: error.message } : undefined
    );
};
