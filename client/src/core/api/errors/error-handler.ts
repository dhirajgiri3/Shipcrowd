import { ApiError } from '../client';
import toast from 'react-hot-toast';

/**
 * Centralized error handler for API errors
 * Displays user-friendly toast messages
 */
export const handleApiError = (error: unknown, context?: string): void => {
    const apiError = error as ApiError;

    const prefix = context ? `${context}: ` : '';
    const message = apiError.message || 'An unexpected error occurred';

    // Show error toast
    toast.error(`${prefix}${message}`, {
        duration: 5000,
        position: 'top-right',
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
        console.error('[API Error Handler]', {
            context,
            error: apiError,
        });
    }
};

/**
 * Success toast helper
 */
export const showSuccessToast = (message: string): void => {
    toast.success(message, {
        duration: 3000,
        position: 'top-right',
    });
};

/**
 * Info toast helper
 */
export const showInfoToast = (message: string): void => {
    toast(message, {
        duration: 4000,
        position: 'top-right',
        icon: 'ℹ️',
    });
};
