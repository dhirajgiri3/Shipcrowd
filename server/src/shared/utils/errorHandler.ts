import { Response, NextFunction } from 'express';
import { z } from 'zod';
import {
    AppError,
    AuthenticationError,
    ValidationError,
    DatabaseError,
    NotFoundError,
    ConflictError,
    AuthorizationError,
    RateLimitError,
    ExternalServiceError,
} from '../errors/app.error';
import { sendError, sendValidationError } from './responseHelper';
import logger from '../logger/winston.logger';

/**
 * Centralized controller error handler
 * Handles all error types consistently across controllers
 *
 * This utility provides a single, consistent way to handle errors in controllers.
 * It normalizes different error types and sends appropriate responses.
 *
 * @param error - The error object (can be any type)
 * @param res - Express response object
 * @param next - Express next function
 * @param operation - Operation name for logging context (e.g., 'createOrder', 'login')
 *
 * @example
 * ```typescript
 * export const createOrder = async (req, res, next) => {
 *   try {
 *     const order = await orderService.create(req.body);
 *     sendCreated(res, { order }, 'Order created successfully');
 *   } catch (error) {
 *     handleControllerError(error, res, next, 'createOrder');
 *   }
 * };
 * ```
 */
export const handleControllerError = (
    error: any,
    res: Response,
    next: NextFunction,
    operation: string
): void => {
    // Always log the error with operation context for debugging
    logger.error(`Controller error: ${operation}`, {
        error: {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
        },
        operation,
    });

    // 1. Zod validation errors → Transform to field-level errors
    if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
            code: 'VALIDATION_ERROR',
            message: err.message,
            field: err.path.join('.'),
        }));
        sendValidationError(res, errors);
        return;
    }

    // 2. Authentication errors (401)
    if (error instanceof AuthenticationError) {
        sendError(res, error.message, error.statusCode, error.code as string);
        return;
    }

    // 3. Authorization errors (403)
    if (error instanceof AuthorizationError) {
        sendError(res, error.message, error.statusCode, error.code as string);
        return;
    }

    // 4. Validation errors (400)
    if (error instanceof ValidationError) {
        sendError(res, error.message, error.statusCode, error.code as string);
        return;
    }

    // 5. Not found errors (404)
    if (error instanceof NotFoundError) {
        sendError(res, error.message, error.statusCode, error.code as string);
        return;
    }

    // 6. Conflict errors (409)
    if (error instanceof ConflictError) {
        sendError(res, error.message, error.statusCode, error.code as string);
        return;
    }

    // 7. Rate limit errors (429)
    if (error instanceof RateLimitError) {
        sendError(res, error.message, error.statusCode, error.code as string);
        return;
    }

    // 8. External service errors (502/503)
    if (error instanceof ExternalServiceError) {
        sendError(res, error.message, error.statusCode, error.code as string);
        return;
    }

    // 9. Database errors (500) - Don't expose internal details
    if (error instanceof DatabaseError) {
        sendError(
            res,
            'Operation failed. Please try again.',
            500,
            error.code as string
        );
        return;
    }

    // 10. Generic AppError - Use its status and message
    if (error instanceof AppError) {
        sendError(res, error.message, error.statusCode, error.code as string);
        return;
    }

    // 11. Unknown errors → Pass to global error handler
    // The global error handler in app.ts will normalize and respond
    next(error);
};
