import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Normalized API error format
 */
export interface ApiError {
    code: string;
    message: string;
    field?: string;
}

/**
 * Create axios instance with configuration
 * Tokens are now stored in httpOnly cookies, not localStorage
 */
const createApiClient = (): AxiosInstance => {
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api/v1';

    const client = axios.create({
        baseURL,
        timeout: 30000,
        withCredentials: true, // Send cookies with every request
        headers: {
            'Content-Type': 'application/json',
        },
    });

    /**
     * Request interceptor: Log requests in development
     */
    client.interceptors.request.use(
        (config: InternalAxiosRequestConfig) => {
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
     * Response interceptor: Handle errors and auto-refresh
     */
    client.interceptors.response.use(
        (response: AxiosResponse) => {
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

            // Handle 401 - try to refresh token (ensure we don't get into an infinite loop)
            // We also exclude /auth/login because a 401 on login means invalid credentials, not an expired token
            if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/refresh') && !originalRequest.url?.includes('/auth/login')) {
                originalRequest._retry = true;

                try {
                    // Token refresh will set new cookies automatically
                    await client.post('/auth/refresh');
                    // Retry the original request
                    return client(originalRequest);
                } catch (refreshError) {
                    // Refresh failed - redirect to login
                    if (typeof window !== 'undefined') {
                        window.location.href = '/login';
                    }
                    return Promise.reject(normalizeError(error));
                }
            }

            // Handle 5xx with retry
            if (error.response?.status && error.response.status >= 500) {
                const retryCount = (originalRequest as any).__retryCount || 0;
                if (retryCount < 2) {
                    (originalRequest as any).__retryCount = retryCount + 1;
                    await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
                    return client(originalRequest);
                }
            }

            // Only log unexpected errors (not 401s which are expected for unauthenticated users)
            if (process.env.NODE_ENV === 'development' && error.response?.status !== 401) {
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
