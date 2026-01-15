/**
 * Error Sanitization Middleware
 * ISSUE #24: Sanitize error messages to prevent information leakage
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Sanitize error messages for production
 * Removes sensitive information like stack traces, file paths, etc.
 */
export const sanitizeError = (error: any, req: Request, res: Response, next: NextFunction): void => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isProduction = process.env.NODE_ENV === 'production';

    // Log full error details internally
    logger.error('Error occurred:', {
        message: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        userId: req.user?._id,
        ip: req.ip,
    });

    // Determine status code
    const statusCode = error.statusCode || error.status || 500;

    // Build response
    const response: any = {
        success: false,
        code: error.code || 'INTERNAL_ERROR',
    };

    // In development, include detailed error information
    if (isDevelopment) {
        response.message = error.message || 'An error occurred';
        response.stack = error.stack;
        response.details = error.details;
    } else {
        // In production, use generic messages for server errors
        if (statusCode >= 500) {
            response.message = 'An internal server error occurred. Please try again later.';
        } else {
            // Client errors (4xx) can show the actual message
            response.message = error.message || 'An error occurred';
        }
    }

    // Never expose sensitive information
    delete response.stack;
    delete response.config;
    delete response.request;

    // Send response
    res.status(statusCode).json(response);
};

/**
 * Sanitize MongoDB errors to prevent schema leakage
 */
export const sanitizeMongoError = (error: any): any => {
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        // Don't expose MongoDB error details in production
        if (process.env.NODE_ENV === 'production') {
            return {
                message: 'A database error occurred',
                code: 'DATABASE_ERROR',
            };
        }
    }

    if (error.name === 'ValidationError') {
        // Sanitize validation errors but keep field information
        return {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            fields: Object.keys(error.errors || {}),
        };
    }

    return error;
};

export default sanitizeError;
