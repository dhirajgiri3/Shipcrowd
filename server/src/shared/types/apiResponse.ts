/**
 * Standard API Response Types
 * Provides consistent response structure across all API endpoints
 */

/**
 * Standard error object structure
 */
export interface ApiError {
    code: string;
    message: string;
    details?: any;
    field?: string;
}

/**
 * Pagination metadata for list responses
 */
export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasNext?: boolean;
    hasPrev?: boolean;
}

/**
 * Base API response structure
 */
export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: ApiError;
    errors?: ApiError[];
    pagination?: PaginationMeta;
    timestamp: string;
}

/**
 * Success response type
 */
export interface SuccessResponse<T = any> extends ApiResponse<T> {
    success: true;
    data: T;
}

/**
 * Error response type
 */
export interface ErrorResponse extends ApiResponse<never> {
    success: false;
    error: ApiError;
}

/**
 * Paginated response type
 */
export interface PaginatedResponse<T = any> extends SuccessResponse<T[]> {
    pagination: PaginationMeta;
    stats?: Record<string, number>;
}
