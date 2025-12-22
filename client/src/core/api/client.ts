import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

const STORAGE_KEY = 'shipcrowd_token';

/**
 * Normalized API error format
 */
export interface ApiError {
    code: string;
    message: string;
    field?: string;
}

/**
 * Get auth token from localStorage
 */
const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY);
};

/**
 * Set auth token in localStorage
 */
export const setAuthToken = (token: string): void => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, token);
    }
};

/**
 * Remove auth token from localStorage
 */
export const removeAuthToken = (): void => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
    }
};

/**
 * Create axios instance with configuration
 */
const createApiClient = (): AxiosInstance => {
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api/v1';

    const client = axios.create({
        baseURL,
        timeout: 30000,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    /**
     * Request interceptor: Add Bearer token
     */
    client.interceptors.request.use(
        (config: InternalAxiosRequestConfig) => {
            const token = getAuthToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }

            // Log requests in development
            if (process.env.NODE_ENV === 'development') {
                console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
                    params: config.params,
                    data: config.data,
                });
            }

            return config;
        },
        (error) => {
            console.error('[API Request Error]', error);
            return Promise.reject(error);
        }
    );

    /**
     * Response interceptor: Handle errors
     */
    client.interceptors.response.use(
        (response: AxiosResponse) => {
            // Log successful responses in development
            if (process.env.NODE_ENV === 'development') {
                console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
                    status: response.status,
                    data: response.data,
                });
            }
            return response;
        },
        async (error: AxiosError) => {
            const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

            // Handle 401 Unauthorized
            if (error.response?.status === 401 && !originalRequest._retry) {
                originalRequest._retry = true;

                // Remove invalid token
                removeAuthToken();

                // TODO: Temporarily disabled for development - Re-enable when auth is fully implemented
                // Redirect to login
                // if (typeof window !== 'undefined') {
                //     window.location.href = '/login';
                // }

                return Promise.reject(normalizeError(error));
            }

            // Handle 403 Forbidden
            if (error.response?.status === 403) {
                console.error('[403 Forbidden]', error.response.data);
                // Show toast notification (will be handled by React Query error callback)
            }

            // Handle 5xx Server Errors with retry
            if (error.response?.status && error.response.status >= 500) {
                const retryCount = (originalRequest as any).__retryCount || 0;
                const maxRetries = 2;

                if (retryCount < maxRetries) {
                    (originalRequest as any).__retryCount = retryCount + 1;
                    const backoffDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff

                    console.warn(`[Retry ${retryCount + 1}/${maxRetries}] ${error.config?.url} after ${backoffDelay}ms`);

                    await new Promise((resolve) => setTimeout(resolve, backoffDelay));
                    return client(originalRequest);
                }
            }

            // Log errors in development
            if (process.env.NODE_ENV === 'development') {
                console.error('[API Response Error]', {
                    url: error.config?.url,
                    method: error.config?.method,
                    status: error.response?.status,
                    data: error.response?.data,
                });
            }

            return Promise.reject(normalizeError(error));
        }
    );

    return client;
};

/**
 * Normalize error to consistent format
 */
export const normalizeError = (error: AxiosError): ApiError => {
    // Network error
    if (!error.response) {
        return {
            code: 'NETWORK_ERROR',
            message: 'Unable to connect to server. Please check your internet connection.',
        };
    }

    // API error with custom format
    const responseData = error.response.data as any;
    if (responseData?.message) {
        return {
            code: responseData.code || `HTTP_${error.response.status}`,
            message: responseData.message,
            field: responseData.field,
        };
    }

    // Generic HTTP error
    const statusMessages: Record<number, string> = {
        400: 'Invalid request. Please check your input.',
        401: 'You are not authorized. Please log in.',
        403: 'You do not have permission to perform this action.',
        404: 'The requested resource was not found.',
        500: 'Server error. Please try again later.',
        503: 'Service temporarily unavailable. Please try again later.',
    };

    return {
        code: `HTTP_${error.response.status}`,
        message: statusMessages[error.response.status] || 'An unexpected error occurred.',
    };
};

/**
 * Export singleton instance
 */
export const apiClient = createApiClient();

/**
 * Helper to check if API is enabled
 */
export const isApiEnabled = (): boolean => {
    return process.env.NEXT_PUBLIC_API_ENABLED !== 'false';
};
