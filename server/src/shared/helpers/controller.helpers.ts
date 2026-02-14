import { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import logger from '../logger/winston.logger';
import { AuthenticationError, ValidationError } from '../errors/app.error';
import { ErrorCode } from '../errors/errorCodes';

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
 * Throws errors if checks fail
 *
 * Role-based access:
 * - super_admin: Platform owner, no company required
 * - admin: Platform manager, optional company (dual role if has companyId)
 * - seller: Must have company
 * - staff: Must have company
 *
 * Dual role logic:
 * - Admin WITH companyId = Can access both admin + seller endpoints
 * - Admin WITHOUT companyId = Only admin endpoints (platform-wide)
 */
export const guardChecks = (
    req: Request,
    options: { requireCompany?: boolean } = { requireCompany: true }
): { userId: string; companyId: string; isAdmin: boolean; isSuperAdmin: boolean } => {
    if (!req.user) {
        throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    const isSuperAdmin = req.user.role === 'super_admin';
    const isAdmin = req.user.role === 'admin' || isSuperAdmin;

    // Super admins and admins without company can skip company requirement
    // This allows them to access platform-wide admin endpoints
    if (options.requireCompany && !req.user.companyId && !isAdmin) {
        throw new AuthenticationError('User is not associated with any company', ErrorCode.AUTH_REQUIRED);
    }

    return {
        userId: req.user._id,
        companyId: req.user.companyId || '',
        isAdmin,
        isSuperAdmin,
    };
};

/**
 * Require a valid company context for company-scoped endpoints.
 * Call after guardChecks when the handler must have auth.companyId (e.g. seller dashboard, wallet, COD).
 * Throws AuthenticationError if companyId is missing, ValidationError if invalid format.
 */
export const requireCompanyContext = (auth: { companyId: string }): void => {
    if (!auth.companyId) {
        throw new AuthenticationError('User is not associated with any company', ErrorCode.AUTH_REQUIRED);
    }
    validateObjectId(auth.companyId, 'company');
};

/**
 * Require platform admin access (admin or super_admin role).
 * Call after guardChecks for admin-only endpoints.
 * Throws AuthenticationError if user is not an admin or super_admin.
 */
export const requirePlatformAdmin = (auth: { isAdmin: boolean }): void => {
    if (!auth.isAdmin) {
        throw new AuthenticationError('Admin access required', ErrorCode.AUTHZ_FORBIDDEN);
    }
};

/**
 * Validate MongoDB ObjectId format
 */
export const isValidObjectId = (id: string): boolean => {
    return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Validate ObjectId and throw error if invalid
 */
export const validateObjectId = (
    id: string,
    entityName: string = 'resource'
): void => {
    if (!isValidObjectId(id)) {
        throw new ValidationError(`Invalid ${entityName} ID format`, ErrorCode.VAL_INVALID_INPUT);
    }
};

/**
 * Handle Zod validation errors
 * Returns true if handled (error response sent), false if not a Zod error
 * @deprecated Use standardized error handling middleware instead
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
): { total: number; page: number; limit: number; pages: number } => {
    const pages = total === 0 ? 1 : Math.max(1, Math.ceil(total / limit));
    return {
        total,
        page,
        limit,
        pages,
    };
};

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
 * @deprecated Use try-catch blocks with standard Error classes in controllers
 */
export const asyncHandler = <T extends (...args: any[]) => Promise<void>>(
    fn: T
): T => {
    return (async (...args: Parameters<T>) => {
        try {
            await fn(...args);
        } catch (error) {
            const [, , next] = args; // req, res, next
            next(error);
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
    requireCompanyContext,
    requirePlatformAdmin,
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
