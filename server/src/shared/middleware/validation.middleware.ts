import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { sendValidationError } from '../utils/responseHelper';
import { sanitizeObject } from '../utils/sanitize';
import logger from '../logger/winston.logger';

/**
 * Validation target - which part of the request to validate
 */
export type ValidationTarget = 'body' | 'params' | 'query' | 'headers';

/**
 * Validation options
 */
export interface ValidationOptions {
    /**
     * Whether to sanitize input before validation
     * @default true
     */
    sanitize?: boolean;

    /**
     * Whether to strip unknown fields
     * @default true
     */
    stripUnknown?: boolean;

    /**
     * Whether to log validation errors
     * @default true
     */
    logErrors?: boolean;
}

/**
 * Multi-layer validation middleware factory
 * 
 * Creates Express middleware that validates request data against a Zod schema
 * Supports validation of body, params, query, and headers
 * 
 * @param schema - Zod schema to validate against
 * @param target - Which part of the request to validate
 * @param options - Validation options
 * @returns Express middleware function
 * 
 * @example
 * ```typescript
 * const createOrderSchema = z.object({
 *   customerName: z.string().min(1),
 *   items: z.array(z.object({
 *     sku: z.string(),
 *     quantity: z.number().positive()
 *   }))
 * });
 * 
 * router.post('/orders',
 *   validate(createOrderSchema, 'body'),
 *   orderController.create
 * );
 * ```
 */
export const validate = (
    schema: ZodSchema,
    target: ValidationTarget = 'body',
    options: ValidationOptions = {}
) => {
    const {
        sanitize = true,
        stripUnknown = true,
        logErrors = true,
    } = options;

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            // Get data to validate
            let data = req[target];

            // Sanitize input if enabled
            if (sanitize && typeof data === 'object' && data !== null) {
                data = sanitizeObject(data, {
                    stripHtml: true,
                    normalizeWhitespace: true,
                    removeNullBytes: true,
                });
            }

            // Validate with Zod
            const validated = await schema.parseAsync(data);

            // Replace request data with validated (and possibly stripped) data
            (req as any)[target] = validated;

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                // Transform Zod errors to our format
                const errors = error.errors.map(err => ({
                    code: 'VALIDATION_ERROR',
                    message: err.message,
                    field: err.path.join('.'),
                }));

                if (logErrors) {
                    logger.warn('Validation error', {
                        target,
                        errors,
                        path: req.path,
                        method: req.method,
                    });
                }

                sendValidationError(res, errors);
                return;
            }

            // Unexpected error - pass to error handler
            next(error);
        }
    };
};

/**
 * Validate multiple targets at once
 * 
 * @param schemas - Object mapping targets to schemas
 * @param options - Validation options
 * @returns Express middleware function
 * 
 * @example
 * ```typescript
 * router.put('/orders/:id',
 *   validateMultiple({
 *     params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/) }),
 *     body: updateOrderSchema
 *   }),
 *   orderController.update
 * );
 * ```
 */
export const validateMultiple = (
    schemas: Partial<Record<ValidationTarget, ZodSchema>>,
    options: ValidationOptions = {}
) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const {
            sanitize = true,
            stripUnknown = true,
            logErrors = true,
        } = options;

        try {
            // Validate each target
            for (const [target, schema] of Object.entries(schemas)) {
                if (!schema) continue;

                let data = req[target as ValidationTarget];

                // Sanitize if enabled
                if (sanitize && typeof data === 'object' && data !== null) {
                    data = sanitizeObject(data, {
                        stripHtml: true,
                        normalizeWhitespace: true,
                        removeNullBytes: true,
                    });
                }

                // Validate
                const validated = await schema.parseAsync(data);
                (req as any)[target] = validated;
            }

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const errors = error.errors.map(err => ({
                    code: 'VALIDATION_ERROR',
                    message: err.message,
                    field: err.path.join('.'),
                }));

                if (logErrors) {
                    logger.warn('Validation error', {
                        errors,
                        path: req.path,
                        method: req.method,
                    });
                }

                sendValidationError(res, errors);
                return;
            }

            next(error);
        }
    };
};

/**
 * Create a validation middleware with custom error messages
 * 
 * @param schema - Zod schema
 * @param target - Validation target
 * @param errorMap - Custom error messages
 * @returns Express middleware
 */
export const validateWithCustomErrors = (
    schema: ZodSchema,
    target: ValidationTarget = 'body',
    errorMap: Record<string, string>
) => {
    return validate(
        schema.refine(
            () => true,
            {
                params: { errorMap }
            }
        ),
        target
    );
};
