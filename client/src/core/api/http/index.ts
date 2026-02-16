import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import {
    csrfManager,
    resetAuthState,
    isRefreshBlocked,
    setCircuitBreaker,
    getRefreshState,
    setRefreshState,
    incrementRefreshAttempt,
    resetRefreshAttempt,
    addToFailedQueue,
    processQueue,
    detectGhostSession,
} from './auth';
import { ERROR_MESSAGES } from '../../error/messages';

/**
 * Normalized API error format
 */
export interface ApiError {
    code: string;
    message: string;
    field?: string;
    details?: any;
}

export class ApiClientError extends Error implements ApiError {
    code: string;
    field?: string;
    details?: any;

    constructor(params: ApiError) {
        super(params.message);
        this.name = 'ApiClientError';
        this.code = params.code;
        this.field = params.field;
        this.details = params.details;
    }
}

/**
 * Get and validate base API URL
 * @throws Error if API URL is missing or invalid in production
 */
const getBaseURL = (): string => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const isDevelopment = process.env.NODE_ENV === 'development';

    // ✅ Require API URL in production
    if (process.env.NODE_ENV === 'production' && !apiUrl) {
        throw new Error(
            '❌ NEXT_PUBLIC_API_URL is required in production.\n' +
            'Please configure it in your environment variables.\n' +
            'Example: NEXT_PUBLIC_API_URL=https://api.Shipcrowd.com/v1'
        );
    }

    // ✅ Validate URL format if provided
    if (apiUrl) {
        // Check if it's a relative URL (for Next.js proxy) or absolute URL
        const isRelativeUrl = apiUrl.startsWith('/');
        const isAbsoluteUrl = apiUrl.startsWith('http://') || apiUrl.startsWith('https://');

        if (!isRelativeUrl && !isAbsoluteUrl) {
            throw new Error(
                `❌ Invalid NEXT_PUBLIC_API_URL: "${apiUrl}"\n` +
                'Must start with http://, https://, or / (for Next.js proxy)\n' +
                'Examples:\n' +
                '  - Production: https://api.Shipcrowd.com/v1\n' +
                '  - With Next.js proxy: /api/v1'
            );
        }

        // Validate absolute URL structure (skip validation for relative URLs)
        if (isAbsoluteUrl) {
            try {
                new URL(apiUrl);
            } catch {
                throw new Error(
                    `❌ Invalid NEXT_PUBLIC_API_URL: "${apiUrl}"\n` +
                    'Must be a valid URL.\n' +
                    'Example: https://api.Shipcrowd.com/v1'
                );
            }
        }

        // ✅ Warn if using HTTP in production for non-local hosts (skip for relative URLs)
        if (process.env.NODE_ENV === 'production' && apiUrl.startsWith('http://')) {
            const parsedUrl = new URL(apiUrl);
            const hostname = parsedUrl.hostname.toLowerCase();
            const isLocalHost =
                hostname === 'localhost' ||
                hostname === '127.0.0.1' ||
                hostname === '::1';

            if (!isLocalHost) {
                console.warn(
                    '⚠️  WARNING: Using HTTP in production is insecure.\n' +
                    'Please use HTTPS for production API URL.'
                );
            }
        }

        // ℹ️ Log when using Next.js proxy pattern
        if (apiUrl.startsWith('/') && process.env.NODE_ENV === 'development') {
            console.log(
                '📡 Using Next.js API proxy pattern.\n' +
                `API requests to "${apiUrl}" will be forwarded to backend via proxy route.`
            );
        }
    }

    // In development always use Next.js same-origin proxy.
    // This avoids CORS/cookie issues when switching between localhost and tunnel URLs.
    if (isDevelopment) {
        return '/api/v1';
    }

    return apiUrl || '/api/v1';
};

const createApiClient = (): AxiosInstance => {
    const baseURL = getBaseURL();
    const isDevelopment = process.env.NODE_ENV === 'development';

    const client = axios.create({
        baseURL,
        timeout: isDevelopment ? 15000 : 30000,
        withCredentials: true, // Send cookies with every request
    });

    const summarizePayload = (payload: unknown): unknown => {
        if (payload == null) return payload;
        if (Array.isArray(payload)) return { type: 'array', length: payload.length };
        if (typeof payload !== 'object') return payload;

        const objectPayload = payload as Record<string, unknown>;
        const keys = Object.keys(objectPayload);
        const summary: Record<string, unknown> = { type: 'object', keys: keys.slice(0, 8) };
        if ('success' in objectPayload) summary.success = objectPayload.success;
        if ('message' in objectPayload) summary.message = objectPayload.message;
        if ('data' in objectPayload) {
            const data = objectPayload.data as unknown;
            summary.data = Array.isArray(data)
                ? { type: 'array', length: data.length }
                : (typeof data === 'object' && data !== null
                    ? { type: 'object', keys: Object.keys(data as Record<string, unknown>).slice(0, 8) }
                    : data);
        }
        return summary;
    };

    /**
     * Request interceptor: Add CSRF token and log requests
     */
    client.interceptors.request.use(
        async (config: InternalAxiosRequestConfig) => {
            // Set JSON content type only for body-carrying requests
            if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
                if (!config.headers['Content-Type']) {
                    config.headers['Content-Type'] = 'application/json';
                }
            }

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

            if (isDevelopment) {
                console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
                    params: summarizePayload(config.params),
                    data: summarizePayload(config.data),
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
            if (isDevelopment) {
                console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
                    status: response.status,
                    data: summarizePayload(response.data),
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
                !originalRequest.headers?.['X-Skip-Refresh'] &&
                !isUrlPath(originalRequest.url, '/auth/refresh') &&
                !isUrlPath(originalRequest.url, '/auth/login')
            ) {
                // ✅ Note: HttpOnly cookies are not visible to JS, so we don't block refresh based on document.cookie.
                // We'll attempt refresh and let the server decide if the session is valid.
                const sessionState = detectGhostSession();
                if (process.env.NODE_ENV === 'development' && sessionState !== 'valid') {
                    console.warn(`[API] Session state (client-visible cookies): ${sessionState}. Attempting refresh anyway.`);
                }
                // Check terminal/non-refreshable codes from both response shapes:
                // { code } and { error: { code } }.
                const responseData = error.response?.data as any;
                const errorCode = responseData?.code || responseData?.error?.code;
                const terminalCodes = [
                    'SESSION_EXPIRED',
                    'SESSION_TIMEOUT',
                    'REFRESH_TOKEN_REQUIRED',
                    'AUTH_REQUIRED',
                    'AUTHENTICATION_REQUIRED',
                    'AUTH_TOKEN_INVALID',
                    'AUTH_TOKEN_EXPIRED',
                ];

                if (terminalCodes.includes(errorCode)) {
                    if (process.env.NODE_ENV === 'development') {
                        console.warn(`[API] Terminal error code: ${errorCode}, skipping refresh`);
                    }

                    if (typeof window !== 'undefined') {
                        const currentPath = window.location.pathname;
                        const { shouldNotRedirectOnAuthFailure } = await import('@/src/config/routes');

                        if (!shouldNotRedirectOnAuthFailure(currentPath)) {
                            window.location.href = '/login?session_expired=true';
                        }
                    }
                    return Promise.reject(normalizeError(error));
                }

                const refreshState = getRefreshState();

                // Check circuit breaker
                if (isRefreshBlocked()) {
                    return Promise.reject(normalizeError(error));
                }

                // Check max attempts
                if (refreshState.refreshAttemptCount >= refreshState.MAX_REFRESH_ATTEMPTS) {
                    setCircuitBreaker(true);

                    if (typeof window !== 'undefined') {
                        const currentPath = window.location.pathname;
                        const { shouldNotRedirectOnAuthFailure } = await import('@/src/config/routes');

                        if (!shouldNotRedirectOnAuthFailure(currentPath)) {
                            window.location.href = '/login?auth_error=session_expired';
                        }
                    }
                    return Promise.reject(normalizeError(error));
                }

                // If already refreshing, queue this request
                if (refreshState.isRefreshing) {
                    return new Promise((resolve, reject) => {
                        addToFailedQueue(resolve, reject);
                    }).then(() => {
                        originalRequest._retry = true;
                        return client(originalRequest);
                    });
                }

                originalRequest._retry = true;
                setRefreshState(true);
                incrementRefreshAttempt();

                try {
                    await client.post('/auth/refresh');

                    resetRefreshAttempt();
                    setCircuitBreaker(false);
                    processQueue(null);

                    return client(originalRequest);
                } catch (refreshError: any) {
                    setCircuitBreaker(true);
                    processQueue(refreshError, null);
                    resetAuthState();

                    if (typeof window !== 'undefined') {
                        const currentPath = window.location.pathname;
                        const { shouldNotRedirectOnAuthFailure } = await import('@/src/config/routes');

                        if (!shouldNotRedirectOnAuthFailure(currentPath)) {
                            window.location.href = '/login?session_expired=true';
                        }
                    }
                    return Promise.reject(normalizeError(error));
                } finally {
                    setRefreshState(false);
                }
            }

            // Handle 403 - Forbidden (access denied)
            if (error.response?.status === 403) {
                const responseData = error.response.data as any;
                let userMessage = 'You do not have permission to perform this action.';

                // ✅ Handle CSRF token invalid/expired (retry once with a fresh token)
                if (responseData?.code === 'CSRF_TOKEN_INVALID') {
                    csrfManager.clearToken();

                    if (process.env.NODE_ENV === 'development') {
                        console.warn('[CSRF] Token consumed or invalid, fetching new one');
                    }

                    if (!originalRequest._retry) {
                        originalRequest._retry = true;
                        try {
                            const newToken = await csrfManager.getToken();
                            originalRequest.headers['X-CSRF-Token'] = newToken;
                            return client(originalRequest);
                        } catch (tokenError) {
                            return Promise.reject(
                                new ApiClientError({
                                    code: 'CSRF_FETCH_ERROR',
                                    message: 'Failed to fetch CSRF token. Please refresh the page.',
                                })
                            );
                        }
                    }

                    userMessage = 'Security token expired. Please try again.';
                }
                // ✅ Handle CSRF origin mismatch (token refresh cannot fix this)
                else if (responseData?.code === 'CSRF_ORIGIN_INVALID') {
                    userMessage = 'Request origin is not allowed. Please try again after reconnecting.';
                }
                // Check for specific 403 reasons in response
                else if (responseData?.code === 'KYC_REQUIRED' || responseData?.message?.toLowerCase().includes('kyc')) {
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
                return Promise.reject(
                    new ApiClientError({
                        code: responseData?.code || 'HTTP_403',
                        message: userMessage,
                        field: responseData?.field,
                    })
                );
            }

            // Only log unexpected errors (skip 401 auth and 404 not-found which are expected)
            if (isDevelopment && error.response?.status !== 401 && error.response?.status !== 404) {
                // Extract error details with fallbacks
                const responseData = error.response?.data as any;
                const errorDetails: any = {
                    url: error.config?.url || 'unknown',
                    method: (error.config?.method || 'unknown').toUpperCase(),
                    status: error.response?.status || 'no response',
                    message: responseData?.message || responseData?.error?.message || error.message || 'No message',
                    code: responseData?.code || responseData?.error?.code || 'No code',
                    data: summarizePayload(responseData)
                };

                // Handle network errors
                if (!error.response) {
                    errorDetails.error = error.message || 'Network error';
                    errorDetails.status = 'NETWORK_ERROR';
                }

                const hasResponseData =
                    errorDetails.data &&
                    typeof errorDetails.data === 'object' &&
                    Object.keys(errorDetails.data).length > 0;

                // Use warnings to avoid noisy Next.js dev overlay for handled API failures.
                console.groupCollapsed('⚠️ [API Response Error]');
                console.warn('Context:', { url: errorDetails.url, method: errorDetails.method, status: errorDetails.status });
                console.warn('Message:', errorDetails.message);
                console.warn('Code:', errorDetails.code);
                if (hasResponseData) console.warn('Response Data:', errorDetails.data);
                console.groupEnd();
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
    // ✅ Idempotency: Input is already a normalized ApiError
    if (error && typeof error === 'object' && 'code' in error && 'message' in error && !axios.isAxiosError(error) && !(error instanceof Error)) {
        return new ApiClientError(error as ApiError);
    }

    // Handle Axios Errors
    if (axios.isAxiosError(error)) {
        // Timeout
        if (error.code === 'ECONNABORTED') {
            return new ApiClientError({
                code: 'TIMEOUT',
                message: ERROR_MESSAGES.TIMEOUT,
            });
        }

        // Network Error
        if (error.code === 'ERR_NETWORK' || !error.response) {
            return new ApiClientError({
                code: 'NETWORK_ERROR',
                message: ERROR_MESSAGES.NETWORK_ERROR,
            });
        }

        // Response Error
        const status = error.response?.status;
        const data = error.response?.data as any;

        // Rate Limit
        if (status === 429) {
            return new ApiClientError({
                code: 'RATE_LIMIT',
                message: ERROR_MESSAGES.HTTP_429,
            });
        }

        // Generic HTTP error messages fallback
        const statusMessages: Record<number, string> = {
            400: ERROR_MESSAGES.HTTP_400,
            401: ERROR_MESSAGES.HTTP_401,
            403: ERROR_MESSAGES.HTTP_403,
            404: ERROR_MESSAGES.HTTP_404,
            500: ERROR_MESSAGES.HTTP_500,
            502: ERROR_MESSAGES.HTTP_502,
            503: ERROR_MESSAGES.HTTP_503,
            504: ERROR_MESSAGES.HTTP_504,
        };

        // Extract message from various common API error formats
        // ✅ PRIORITY: error.message > message > error (string) > status fallback
        // Backend sends: { error: { code, message } } so we check error.message FIRST
        const message =
            data?.error?.message ||  // ✅ Check nested error.message FIRST (backend pattern)
            data?.message ||         // Fallback to top-level message
            (typeof data?.error === 'string' ? data.error : null) ||
            statusMessages[status || 500] ||
            ERROR_MESSAGES.DEFAULT;

        // Extract error code with same priority
        const code =
            data?.error?.code ||     // ✅ Backend error code
            data?.code ||            // Fallback to top-level code
            `HTTP_${status}`;

        return new ApiClientError({
            code,
            message,
            field: data?.field || data?.error?.field,
            details: data?.details // Capture validation details if present
        });
    }

    // Handle generic Error objects
    if (error instanceof Error) {
        return new ApiClientError({
            code: 'CLIENT_ERROR',
            message: error.message,
        });
    }

    // Fallback for unknown error types
    return new ApiClientError({
        code: 'UNKNOWN_ERROR',
        message: ERROR_MESSAGES.DEFAULT,
    });
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

// Re-export auth utilities
export { resetAuthState, isRefreshBlocked, prefetchCSRFToken, clearCSRFToken, detectGhostSession, hasRefreshTokenCookie, hasAccessTokenCookie } from './auth';
