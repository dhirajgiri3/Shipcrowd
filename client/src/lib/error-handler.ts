/**
 * Error Handling and Toast Utilities
 * 
 * Centralized error handling with toast notifications using Sonner
 */

import { toast } from 'sonner';
import { AxiosError } from 'axios';

interface ApiErrorResponse {
    message?: string;
    error?: string;
    errors?: Record<string, string[]>;
}

/**
 * Handle API errors with user-friendly toast notifications
 */
export function handleApiError(error: unknown, fallbackMessage = 'An error occurred') {
    console.error('API Error:', error);

    if (error instanceof AxiosError) {
        const errorData = error.response?.data as ApiErrorResponse;

        // Handle validation errors
        if (errorData?.errors) {
            const firstError = Object.values(errorData.errors)[0]?.[0];
            toast.error(firstError || fallbackMessage);
            return;
        }

        // Handle standard error messages
        const message = errorData?.message || errorData?.error || error.message || fallbackMessage;
        toast.error(message);
        return;
    }

    if (error instanceof Error) {
        toast.error(error.message || fallbackMessage);
        return;
    }

    toast.error(fallbackMessage);
}

/**
 * Show success toast
 */
export function showSuccessToast(message: string) {
    toast.success(message);
}

/**
 * Show info toast
 */
export function showInfoToast(message: string) {
    toast.info(message);
}

/**
 * Show warning toast
 */
export function showWarningToast(message: string) {
    toast.warning(message);
}

/**
 * Show loading toast
 */
export function showLoadingToast(message: string) {
    return toast.loading(message);
}

/**
 * Dismiss a specific toast
 */
export function dismissToast(toastId: string | number) {
    toast.dismiss(toastId);
}

/**
 * Dismiss all toasts
 */
export function dismissAllToasts() {
    toast.dismiss();
}
