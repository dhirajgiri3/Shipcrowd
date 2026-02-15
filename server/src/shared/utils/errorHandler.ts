import { NextFunction } from 'express';
import { z } from 'zod';
import {
ValidationError,
} from '../errors/app.error';
import logger from '../logger/winston.logger';

/**
 * Centralized controller error handler
 * Logs errors with context and passes them to the global error handler
 *
 * This utility provides a single, consistent way to handle errors in controllers.
 * All errors are passed to the global error handler in app.ts which normalizes
 * and responds appropriately.
 *
 * @param error - The error object (can be any type)
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
 *     handleControllerError(error, next, 'createOrder');
 *   }
 * };
 * ```
 */
export const handleControllerError = (
    error: any,
    next: NextFunction,
    operation: string
): void => {
    // Log the error with operation context for debugging
    logger.error(`Controller error: ${operation}`, {
        error: {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
        },
        operation,
    });

    // Convert Zod validation errors to ValidationError for consistent handling
    if (error instanceof z.ZodError) {
        const details = error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
        }));
        const validationError = new ValidationError('Validation failed', details);
        next(validationError);
        return;
    }

    // Pass all errors to the global error handler
    // The global handler in app.ts will normalize and respond appropriately
    next(error);
};
