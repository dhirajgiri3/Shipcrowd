import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Normalized API error format
 */
export interface ApiError {
    code: string;
    message: string;
    field?: string;
    details?: any;
}

/**
 * CSRF Token Manager
 * Handles fetching and caching CSRF tokens
 */
class CSRFTokenManager {
    private token: string | null = null;
    private isFetching: boolean = false;
    private fetchPromise: Promise<string> | null = null;

    async getToken(): Promise<string> {
        // Return cached token if available
        if (this.token) {
            return this.token;
        }

        // If already fetching, wait for that request
        if (this.isFetching && this.fetchPromise) {
            return this.fetchPromise;
        }

        // Fetch new token
        this.isFetching = true;
        this.fetchPromise = this.fetchNewToken();

        try {
            this.token = await this.fetchPromise;
            return this.token;
        } finally {
            this.isFetching = false;
            this.fetchPromise = null;
        }
    }

    private async fetchNewToken(): Promise<string> {
        try {
            // Use a separate axios instance to avoid circular dependency
            const response = await axios.get(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api/v1'}/auth/csrf-token`,
                { withCredentials: true }
            );

            // Backend returns: { success: true, data: { csrfToken: string } }
            const token = response.data.data?.csrfToken;

            // ✅ Validate token format (64-character hex string from crypto.randomBytes(32))
            if (!token || token.length !== 64 || !/^[a-f0-9]{64}$/.test(token)) {
                throw new Error('Invalid CSRF token format received from server');
            }

            return token;
        } catch (error: any) {
            // ❌ DO NOT fallback to static string - this breaks production security
            console.error('[CSRF] Failed to fetch CSRF token:', error.message || error);

            // Throw error - let the mutation fail with proper error message
            throw new Error(
                'Failed to fetch CSRF token. Please refresh the page and try again.'
            );
        }
    }

    clearToken() {
        this.token = null;
    }
}

const csrfManager = new CSRFTokenManager();

// ✅ Token Refresh Mutex & Queue
// Prevents multiple simultaneous refresh requests
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};


/**
 * Get and validate base API URL
 * @throws Error if API URL is missing or invalid in production
 */
const getBaseURL = (): string => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    // ✅ Require API URL in production
    if (process.env.NODE_ENV === 'production' && !apiUrl) {
        throw new Error(
            '❌ NEXT_PUBLIC_API_URL is required in production.\n' +
            'Please configure it in your environment variables.\n' +
            'Example: NEXT_PUBLIC_API_URL=https://api.shipcrowd.com/v1'
        );
    }

    // ✅ Validate URL format if provided
    if (apiUrl) {
        // Check if it starts with http:// or https://
        if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
            throw new Error(
                `❌ Invalid NEXT_PUBLIC_API_URL: "${apiUrl}"\n` +
                'Must start with http:// or https://\n' +
                'Example: https://api.shipcrowd.com/v1'
            );
        }

        // Validate URL structure
        try {
            new URL(apiUrl);
        } catch {
            throw new Error(
                `❌ Invalid NEXT_PUBLIC_API_URL: "${apiUrl}"\n` +
                'Must be a valid URL.\n' +
                'Example: https://api.shipcrowd.com/v1'
            );
        }

        // ✅ Warn if using HTTP in production (should use HTTPS)
        if (process.env.NODE_ENV === 'production' && apiUrl.startsWith('http://')) {
            console.warn(
                '⚠️  WARNING: Using HTTP in production is insecure.\n' +
                'Please use HTTPS for production API URL.'
            );
        }
    }

    return apiUrl || 'http://localhost:5005/api/v1';
};

/**
 * Pre-fetch CSRF token to ensure it's available before first mutation
 */
export const prefetchCSRFToken = () => csrfManager.getToken();

const createApiClient = (): AxiosInstance => {
    const baseURL = getBaseURL();

    const client = axios.create({
        baseURL,
        timeout: 30000,
        withCredentials: true, // Send cookies with every request
        headers: {
            'Content-Type': 'application/json',
        },
    });

    /**
     * Request interceptor: Add CSRF token and log requests
     */
    client.interceptors.request.use(
        async (config: InternalAxiosRequestConfig) => {
            // Add CSRF token for state-changing requests
            if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
                // Check if CSRF token is already set (from function call)
                if (!config.headers['X-CSRF-Token'] || config.headers['X-CSRF-Token'] === 'frontend-request') {
                    try {
                        const token = await csrfManager.getToken();
                        config.headers['X-CSRF-Token'] = token;
                    } catch (error) {
                        console.warn('[CSRF] Could not fetch token, using fallback');
                    }
                }
            }

            if (process.env.NODE_ENV === 'development') {
                console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
                    params: config.params,
                    data: config.data,
                    csrfToken: config.headers['X-CSRF-Token'] ? '***' : 'none',
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

            // Helper to check if URL matches a path (handles relative and absolute URLs)
            const isUrlPath = (url: string | undefined, path: string): boolean => {
                if (!url) return false;
                // Normalize to pathname only (remove baseURL if present)
                const pathname = url.includes('://') ? new URL(url).pathname : url;
                return pathname.includes(path);
            };

            // Handle 401 - try to refresh token (ensure we don't get into an infinite loop)
            // Exclude: refresh endpoint itself, login endpoint, and already retried requests
            if (
                error.response?.status === 401 &&
                !originalRequest._retry &&
                !isUrlPath(originalRequest.url, '/auth/refresh') &&
                !isUrlPath(originalRequest.url, '/auth/login')
            ) {
                // ✅ If already refreshing, queue this request
                if (isRefreshing) {
                    return new Promise((resolve, reject) => {
                        failedQueue.push({ resolve, reject });
                    })
                        .then(() => {
                            return client(originalRequest);
                        })
                        .catch((err) => {
                            return Promise.reject(err);
                        });
                }

                originalRequest._retry = true;
                isRefreshing = true;

                try {
                    // Token refresh will set new cookies automatically
                    await client.post('/auth/refresh');

                    if (process.env.NODE_ENV === 'development') {
                        console.log('[API] Token refreshed, retrying request:', originalRequest.url);
                    }

                    // ✅ Process queue on success
                    processQueue(null);

                    // Retry the original request
                    return client(originalRequest);
                } catch (refreshError) {
                    // ✅ Process queue on failure
                    processQueue(refreshError, null);

                    // Refresh failed - redirect to login ONLY if not already on auth pages
                    if (process.env.NODE_ENV === 'development') {
                        console.warn('[API] Token refresh failed');
                    }

                    if (typeof window !== 'undefined') {
                        const currentPath = window.location.pathname;

                        // Import check function - uses centralized routes config
                        const { shouldNotRedirectOnAuthFailure } = await import('@/src/config/routes');

                        // Only redirect if not on a public page
                        if (!shouldNotRedirectOnAuthFailure(currentPath)) {
                            window.location.href = '/login';
                        }
                    }
                    return Promise.reject(normalizeError(error));
                } finally {
                    isRefreshing = false;
                }
            }

            // Handle 403 - Forbidden (access denied)
            if (error.response?.status === 403) {
                const responseData = error.response.data as any;
                let userMessage = 'You do not have permission to perform this action.';

                // Check for specific 403 reasons in response
                if (responseData?.code === 'KYC_REQUIRED' || responseData?.message?.toLowerCase().includes('kyc')) {
                    userMessage = 'Please complete your KYC verification to access this feature.';
                    if (typeof window !== 'undefined') {
                        // Optionally redirect to KYC page after short delay
                        setTimeout(() => {
                            window.location.href = '/seller/kyc';
                        }, 2000);
                    }
                } else if (responseData?.code === 'COMPANY_INACTIVE' || responseData?.message?.toLowerCase().includes('company')) {
                    userMessage = 'Your company account is inactive. Please contact support or update your company settings.';
                } else if (responseData?.message) {
                    userMessage = responseData.message;
                }

                if (process.env.NODE_ENV === 'development') {
                    console.warn('[API] 403 Forbidden:', {
                        url: error.config?.url,
                        reason: responseData?.code || 'unknown',
                        message: responseData?.message,
                    });
                }

                // Return error with user-friendly message
                return Promise.reject({
                    code: responseData?.code || 'HTTP_403',
                    message: userMessage,
                    field: responseData?.field,
                } as ApiError);
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
                // Extract error details with fallbacks
                const errorDetails: any = {
                    url: error.config?.url || 'unknown',
                    method: (error.config?.method || 'unknown').toUpperCase(),
                    status: error.response?.status || 'no response',
                };

                // Add response data if available
                if (error.response?.data) {
                    const responseData = error.response.data as any;
                    errorDetails.message = responseData.message || 'No message';
                    errorDetails.code = responseData.code || 'No code';
                    errorDetails.data = responseData;
                }

                // Handle network errors
                if (!error.response) {
                    errorDetails.error = error.message || 'Network error';
                    errorDetails.status = 'NETWORK_ERROR';
                }

                console.error('[API Response Error]', errorDetails);
            }

            return Promise.reject(normalizeError(error));
        }
    );

    return client;
};

/**
 * Normalize error to consistent format
 */
export const normalizeError = (error: AxiosError | any): ApiError => {
    // Handle Axios Errors
    if (axios.isAxiosError(error)) {
        // Timeout
        if (error.code === 'ECONNABORTED') {
            return {
                code: 'TIMEOUT',
                message: 'Request timed out. Please check your connection and try again.',
            };
        }

        // Network Error
        if (error.code === 'ERR_NETWORK' || !error.response) {
            return {
                code: 'NETWORK_ERROR',
                message: 'Unable to connect to server. Please check your internet connection.',
            };
        }

        // Response Error
        const status = error.response?.status;
        const data = error.response?.data as any;

        // Rate Limit
        if (status === 429) {
            return {
                code: 'RATE_LIMIT',
                message: 'Too many requests. Please wait a moment and try again.',
            };
        }

        // Generic HTTP error messages fallback
        const statusMessages: Record<number, string> = {
            400: 'Invalid request. Please check your input.',
            401: 'You are not authorized. Please log in.',
            403: 'You do not have permission to perform this action.',
            404: 'The requested resource was not found.',
            500: 'Server error. Please try again later.',
            503: 'Service temporarily unavailable. Please try again later.',
        };

        // Extract message from various common API error formats
        // Priority: data.message > data.error.message > data.error (string) > status fallback
        const message =
            data?.message ||
            data?.error?.message ||
            (typeof data?.error === 'string' ? data.error : null) ||
            statusMessages[status || 500] ||
            'An unexpected error occurred.';

        return {
            code: data?.code || `HTTP_${status}`,
            message,
            field: data?.field || data?.error?.field,
            details: data?.details // Capture validation details if present
        };
    }

    // Handle generic Error objects
    if (error instanceof Error) {
        return {
            code: 'CLIENT_ERROR',
            message: error.message,
        };
    }

    // Fallback for unknown error types
    return {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred.',
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

/**
 * Clear CSRF token (call on logout)
 */
export const clearCSRFToken = () => {
    csrfManager.clearToken();
};
