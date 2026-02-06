/**
 * Error Handling and Toast Utilities
 * 
 * Centralized error handling with toast notifications using Sonner
 * Now supports Critical Errors via Global Event Dispatch
 */

import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { ErrorSeverity, ErrorCategory } from '@/src/core/error/error-types';
import { ERROR_MESSAGES } from '@/src/core/error/messages';

// Import the normalized ApiError type from our API client
export interface ApiError {
    code: string;
    message: string;
    field?: string;
    details?: any;
    severity?: ErrorSeverity; // Added support for severity
}

interface ApiErrorResponse {
    message?: string;
    error?: string | { code?: string; message?: string };
    errors?: Record<string, string[]>;
    severity?: ErrorSeverity; // Backend might send severity
}

/**
 * Dispatch a critical error event for the GlobalErrorProvider to catch
 */
const reportCriticalError = (message: string, code?: string, originalError?: any) => {
    if (typeof window !== 'undefined') {
        const event = new CustomEvent('global-error-report', {
            detail: {
                message,
                code,
                severity: ErrorSeverity.CRITICAL,
                originalError
            }
        });
        window.dispatchEvent(event);
    }
};

/**
 * Handle API errors with user-friendly toast notifications or critical modal
 */
export function handleApiError(error: unknown | ApiError, fallbackMessage = ERROR_MESSAGES.DEFAULT) {
    console.error('API Error:', error);

    // 1. Handle normalized ApiError from our API client
    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
        const apiError = error as ApiError;

        // CHECK IF CRITICAL
        if (apiError.severity === ErrorSeverity.CRITICAL) {
            reportCriticalError(apiError.message, apiError.code, apiError);
            return;
        }

        // Show toast
        toast.error(apiError.message, {
            description: apiError.code ? `Error Code: ${apiError.code}` : undefined,
            duration: 5000,
            id: apiError.message, // Auto-deduplication key
        });
        return;
    }

    // 2. Handle Axios Errors
    if (error instanceof AxiosError) {
        const errorData = error.response?.data as ApiErrorResponse;
        const status = error.response?.status;

        // AUTO-DETECT CRITICAL ERRORS
        // 403 Forbidden shouldn't be critical usually, just toast
        // 503 Service Unavailable -> Critical? Maybe.
        const isCritical = status === 503 || errorData?.severity === ErrorSeverity.CRITICAL;

        if (isCritical) {
            const message = errorData?.message || error.message || fallbackMessage;
            reportCriticalError(message, `HTTP_${status}`, error);
            return;
        }

        // Handle validation errors
        if (errorData?.errors) {
            const firstError = Object.values(errorData.errors)[0]?.[0];
            const msg = firstError || fallbackMessage;
            toast.error(msg, { id: msg });
            return;
        }

        // Handle standard error messages
        const message = errorData?.message || (typeof errorData?.error === 'string' ? errorData?.error : errorData?.error?.message) || error.message || fallbackMessage;
        toast.error(message, { id: message });
        return;
    }

    // 3. Handle Generic Errors
    if (error instanceof Error) {
        const msg = error.message || fallbackMessage;
        toast.error(msg, { id: msg });
        return;
    }

    toast.error(fallbackMessage, { id: fallbackMessage });
}

/**
 * Show success toast
 */
export function showSuccessToast(message: string) {
    toast.success(message, { id: message });
}

/**
 * Show info toast
 */
export function showInfoToast(message: string) {
    toast.info(message, { id: message });
}

/**
 * Show warning toast
 */
export function showWarningToast(message: string) {
    toast.warning(message, { id: message });
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
