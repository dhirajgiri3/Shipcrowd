import { Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { AuthRequest } from '../../presentation/http/middleware/auth';
import logger from '../logger/winston.logger';

/**
 * Standard API error response format (RFC 7807 inspired)
 */
export interface ApiError {
    message: string;
    code?: string;
    errors?: z.ZodIssue[];
    details?: Record<string, any>;
}

/**
 * Handle common controller guard checks
 * Returns null if all checks pass, otherwise sends error response
 */
export const guardChecks = (
    req: AuthRequest,
    res: Response,
    options: { requireCompany?: boolean } = { requireCompany: true }
): { userId: string; companyId: string } | null => {
    if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return null;
    }

    if (options.requireCompany && !req.user.companyId) {
        res.status(403).json({ message: 'User is not associated with any company' });
        return null;
    }

    return {
        userId: req.user._id,
        companyId: req.user.companyId || '',
    };
};

/**
 * Validate MongoDB ObjectId format
 */
export const isValidObjectId = (id: string): boolean => {
    return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Validate ObjectId and send error response if invalid
 * Returns true if valid, false if invalid (and sends response)
 */
export const validateObjectId = (
    id: string,
    res: Response,
    entityName: string = 'resource'
): boolean => {
    if (!isValidObjectId(id)) {
        res.status(400).json({ message: `Invalid ${entityName} ID format` });
        return false;
    }
    return true;
};

/**
 * Handle Zod validation errors
 * Returns true if handled (error response sent), false if not a Zod error
 */
export const handleZodError = (error: unknown, res: Response): boolean => {
    if (error instanceof z.ZodError) {
        res.status(400).json({
            message: 'Validation error',
            errors: error.errors,
        });
        return true;
    }
    return false;
};

/**
 * Standard pagination parameters
 */
export interface PaginationParams {
    page: number;
    limit: number;
    skip: number;
}

/**
 * Parse pagination from query parameters
 */
export const parsePagination = (
    query: { page?: string; limit?: string },
    defaults: { maxLimit?: number; defaultLimit?: number } = {}
): PaginationParams => {
    const { maxLimit = 100, defaultLimit = 20 } = defaults;
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit || String(defaultLimit), 10)));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

/**
 * Build pagination response object
 */
export const buildPaginationResponse = (
    total: number,
    page: number,
    limit: number
): { total: number; page: number; limit: number; pages: number } => ({
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
});

/**
 * Parse date range from query parameters
 */
export const parseDateRange = (
    query: { startDate?: string; endDate?: string }
): { startDate?: Date; endDate?: Date } | null => {
    const result: { startDate?: Date; endDate?: Date } = {};

    if (query.startDate) {
        const date = new Date(query.startDate);
        if (isNaN(date.getTime())) return null;
        result.startDate = date;
    }

    if (query.endDate) {
        const date = new Date(query.endDate);
        if (isNaN(date.getTime())) return null;
        result.endDate = date;
    }

    return result;
};

/**
 * Generate a unique identifier with date prefix
 * Format: PREFIX-YYYYMMDD-XXXX
 */
export const generateDatePrefixedId = (prefix: string): string => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${year}${month}${day}-${random}`;
};

/**
 * Generate unique order number
 */
export const generateOrderNumber = (): string => generateDatePrefixedId('ORD');

/**
 * Generate unique tracking/AWB number
 */
export const generateTrackingNumber = (): string => generateDatePrefixedId('SHP');

/**
 * Wrap async controller functions with standardized error handling
 */
export const asyncHandler = <T extends (...args: any[]) => Promise<void>>(
    fn: T
): T => {
    return (async (...args: Parameters<T>) => {
        try {
            await fn(...args);
        } catch (error) {
            const [, res, next] = args;
            if (error instanceof z.ZodError) {
                res.status(400).json({
                    message: 'Validation error',
                    errors: error.errors,
                });
            } else {
                logger.error('Controller error:', error);
                next(error);
            }
        }
    }) as T;
};

/**
 * Status transition validator
 */
export const validateStatusTransition = (
    currentStatus: string,
    newStatus: string,
    transitions: Record<string, string[]>
): { valid: boolean; allowedTransitions: string[] } => {
    const allowed = transitions[currentStatus] || [];
    return {
        valid: allowed.includes(newStatus),
        allowedTransitions: allowed,
    };
};

export default {
    guardChecks,
    isValidObjectId,
    validateObjectId,
    handleZodError,
    parsePagination,
    buildPaginationResponse,
    parseDateRange,
    generateDatePrefixedId,
    generateOrderNumber,
    generateTrackingNumber,
    asyncHandler,
    validateStatusTransition,
};
