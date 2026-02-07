import { Response } from 'express';
import {
    SuccessResponse,
    PaginatedResponse,
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
    message?: string,
    extras?: { stats?: Record<string, number> }
): Response<PaginatedResponse<T>> => {
    const response: PaginatedResponse<T> = {
        success: true,
        data,
        pagination,
        message,
        timestamp: new Date().toISOString(),
        ...extras
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
