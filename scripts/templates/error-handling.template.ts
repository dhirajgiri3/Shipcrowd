/**
 * TEMPLATE: Error Handling Pattern
 * 
 * Use this template to add proper error handling to services that lack it.
 * 
 * WHEN TO USE:
 * - Service methods have no try-catch blocks
 * - Errors are not logged
 * - Generic errors instead of specific AppError types
 * - No error context for debugging
 */

import { logger } from '@/shared/utils/logger';
import { AppError, ValidationError, NotFoundError, AuthorizationError } from '@/shared/errors/AppError';

export class ServiceName {
    /**
     * Method with proper error handling
     */
    async methodName(id: string, data: DataType): Promise<ReturnType> {
        try {
            // ============================================
            // Business Logic
            // ============================================

            // Validate input
            if (!id || !data) {
                throw new ValidationError('Missing required fields');
            }

            // Fetch resource
            const resource = await Model.findById(id);

            if (!resource) {
                throw new NotFoundError('Resource not found', { id });
            }

            // Check permissions
            if (resource.companyId.toString() !== user.companyId.toString()) {
                throw new AuthorizationError('Cannot access other company resources');
            }

            // Perform operation
            resource.field = data.value;
            await resource.save();

            logger.info('Operation completed successfully', {
                id,
                operation: 'update',
            });

            return resource;

        } catch (error: any) {
            // ============================================
            // Error Handling
            // ============================================

            // Log error with context
            logger.error('Operation failed', {
                id,
                operation: 'methodName',
                error: error.message,
                stack: error.stack,
            });

            // Re-throw known errors (AppError subclasses)
            if (error instanceof AppError) {
                throw error;
            }

            // Handle specific database errors
            if (error.name === 'CastError') {
                throw new ValidationError('Invalid ID format', { id });
            }

            if (error.code === 11000) {
                throw new ValidationError('Duplicate entry', {
                    field: Object.keys(error.keyPattern)[0],
                });
            }

            if (error.name === 'ValidationError') {
                const messages = Object.values(error.errors).map((e: any) => e.message);
                throw new ValidationError(messages.join(', '));
            }

            // Handle external API errors
            if (error.response?.status) {
                throw new AppError(
                    `External service error: ${error.message}`,
                    'EXTERNAL_SERVICE_ERROR',
                    500,
                    error
                );
            }

            // Generic error for unexpected cases
            throw new AppError(
                'Operation failed',
                'OPERATION_FAILED',
                500,
                error
            );
        }
    }
}

/**
 * ERROR HIERARCHY:
 * 
 * AppError (base class)
 * ├── ValidationError (400)
 * ├── NotFoundError (404)
 * ├── AuthorizationError (403)
 * ├── AuthenticationError (401)
 * ├── ConflictError (409)
 * └── RateLimitError (429)
 */

/**
 * EXAMPLE ERROR USAGE:
 * 
 * // Validation error
 * if (!email || !isValidEmail(email)) {
 *     throw new ValidationError('Invalid email format', { email });
 * }
 * 
 * // Not found error
 * const user = await User.findById(id);
 * if (!user) {
 *     throw new NotFoundError('User not found', { id });
 * }
 * 
 * // Authorization error
 * if (user.role !== 'admin') {
 *     throw new AuthorizationError('Admin access required');
 * }
 * 
 * // Generic error with context
 * throw new AppError(
 *     'Payment processing failed',
 *     'PAYMENT_FAILED',
 *     500,
 *     originalError
 * );
 */

/**
 * CHECKLIST AFTER APPLYING:
 * 
 * [ ] All public methods have try-catch blocks
 * [ ] Known errors throw specific AppError subclasses
 * [ ] All errors logged with context
 * [ ] Database errors mapped to ValidationError
 * [ ] External errors mapped appropriately
 * [ ] Error context includes relevant IDs/data
 * [ ] Tests cover error scenarios
 * [ ] Error messages are user-friendly
 */
