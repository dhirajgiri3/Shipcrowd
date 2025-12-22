/**
 * Client-side Error Handler
 * Extracts and formats error messages for display
 */

/**
 * Error response from API
 */
export interface APIError {
    code?: string;
    message: string;
    details?: any;
    errors?: Array<{ message: string; path?: string[] }>;
}

/**
 * Extract user-friendly error message from API error
 */
export const getErrorMessage = (error: any): string => {
    // API error response
    if (error.response?.data) {
        const data = error.response.data;

        // Formatted error with message
        if (data.message) {
            return data.message;
        }

        // Zod validation errors
        if (data.errors && Array.isArray(data.errors)) {
            return data.errors.map((err: any) => err.message).join('. ');
        }
    }

    // Axios network errors
    if (error.code === 'ERR_NETWORK') {
        return 'Network error. Please check your internet connection and try again.';
    }

    if (error.code === 'ECONNABORTED') {
        return 'Request timed out. Please try again.';
    }

    // HTTP status codes
    if (error.response?.status) {
        switch (error.response.status) {
            case 400:
                return 'Invalid request. Please check your input and try again.';
            case 401:
                return 'Please login to continue.';
            case 403:
                return 'You do not have permission to perform this action.';
            case 404:
                return 'Resource not found.';
            case 429:
                return 'Too many requests. Please try again later.';
            case 500:
                return 'Server error. Please try again later.';
            case 503:
                return 'Service temporarily unavailable. Please try again later.';
        }
    }

    // Generic error message
    if (error.message) {
        return error.message;
    }

    return 'An unexpected error occurred. Please try again.';
};

/**
 * Check if error is authentication related
 */
export const isAuthError = (error: any): boolean => {
    const status = error.response?.status;
    const code = error.response?.data?.code;

    return status === 401 || code?.startsWith('auth/');
};

/**
 * Check if error requires retry
 */
export const isRetryableError = (error: any): boolean => {
    const status = error.response?.status;
    const code = error.code;

    return (
        code === 'ERR_NETWORK' ||
        code === 'ECONNABORTED' ||
        status === 408 ||
        status === 429 ||
        status === 503 ||
        status === 504
    );
};
