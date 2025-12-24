import { Response } from 'express';
import {
    ApiResponse,
    SuccessResponse,
    ErrorResponse,
    PaginatedResponse,
    ApiError,
    PaginationMeta,
} from '../types/apiResponse';

/**
 * Send a standardized success response
 * 
 * @param res - Express response object
 * @param data - Response data
 * @param message - Optional success message
 * @param statusCode - HTTP status code (default: 200)
 * @returns Response object
 * 
 * @example
 * sendSuccess(res, { user }, 'User created successfully', 201);
 */
export const sendSuccess = <T>(
    res: Response,
    data: T,
    message?: string,
    statusCode: number = 200
): Response<SuccessResponse<T>> => {
    const response: SuccessResponse<T> = {
        success: true,
        data,
        message,
        timestamp: new Date().toISOString(),
    };

    return res.status(statusCode).json(response);
};

/**
 * Send a standardized error response
 * 
 * @param res - Express response object
 * @param error - Error object or message
 * @param statusCode - HTTP status code (default: 400)
 * @param code - Error code for client-side handling
 * @returns Response object
 * 
 * @example
 * sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
 */
export const sendError = (
    res: Response,
    error: string | ApiError,
    statusCode: number = 400,
    code?: string
): Response<ErrorResponse> => {
    const errorObj: ApiError = typeof error === 'string'
        ? {
            code: code || 'ERROR',
            message: error,
        }
        : error;

    const response: ErrorResponse = {
        success: false,
        error: errorObj,
        timestamp: new Date().toISOString(),
    };

    return res.status(statusCode).json(response);
};

/**
 * Send a standardized validation error response
 * 
 * @param res - Express response object
 * @param errors - Array of validation errors
 * @returns Response object
 * 
 * @example
 * sendValidationError(res, [
 *   { code: 'INVALID_EMAIL', message: 'Email is invalid', field: 'email' },
 *   { code: 'REQUIRED', message: 'Password is required', field: 'password' }
 * ]);
 */
export const sendValidationError = (
    res: Response,
    errors: ApiError[]
): Response<ApiResponse> => {
    const response: ApiResponse = {
        success: false,
        error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
        },
        errors,
        timestamp: new Date().toISOString(),
    };

    return res.status(400).json(response);
};

/**
 * Send a standardized paginated response
 * 
 * @param res - Express response object
 * @param data - Array of items
 * @param pagination - Pagination metadata
 * @param message - Optional success message
 * @returns Response object
 * 
 * @example
 * sendPaginated(res, users, {
 *   total: 100,
 *   page: 1,
 *   limit: 10,
 *   pages: 10,
 *   hasNext: true,
 *   hasPrev: false
 * });
 */
export const sendPaginated = <T>(
    res: Response,
    data: T[],
    pagination: PaginationMeta,
    message?: string
): Response<PaginatedResponse<T>> => {
    const response: PaginatedResponse<T> = {
        success: true,
        data,
        pagination,
        message,
        timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
};

/**
 * Calculate pagination metadata
 * 
 * @param total - Total number of items
 * @param page - Current page number
 * @param limit - Items per page
 * @returns Pagination metadata object
 * 
 * @example
 * const pagination = calculatePagination(100, 2, 10);
 * // { total: 100, page: 2, limit: 10, pages: 10, hasNext: true, hasPrev: true }
 */
export const calculatePagination = (
    total: number,
    page: number,
    limit: number
): PaginationMeta => {
    const pages = Math.ceil(total / limit);

    return {
        total,
        page,
        limit,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1,
    };
};

/**
 * Send a 'No Content' response
 * Useful for delete operations
 * 
 * @param res - Express response object
 * @returns Response object
 */
export const sendNoContent = (res: Response): Response => {
    return res.status(204).send();
};

/**
 * Send a 'Created' response
 * Useful for resource creation
 * 
 * @param res - Express response object
 * @param data - Created resource data
 * @param message - Optional success message
 * @returns Response object
 */
export const sendCreated = <T>(
    res: Response,
    data: T,
    message?: string
): Response<SuccessResponse<T>> => {
    return sendSuccess(res, data, message, 201);
};
