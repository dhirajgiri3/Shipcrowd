/**
 * Authentication Module
 * 
 * Handles CSRF tokens, token refresh, and circuit breaker logic
 * for the API client authentication system.
 */

import axios from 'axios';

// ============================================================================
// CSRF Token Manager
// ============================================================================

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

export const csrfManager = new CSRFTokenManager();

/**
 * Pre-fetch CSRF token to ensure it's available before first mutation
 */
export const prefetchCSRFToken = () => csrfManager.getToken();

/**
 * Clear CSRF token (call on logout)
 */
export const clearCSRFToken = () => {
    csrfManager.clearToken();
};

// ============================================================================
// Token Refresh & Circuit Breaker
// ============================================================================

/**
 * Token Refresh Mutex & Queue
 * Prevents multiple simultaneous refresh requests (both within tab and across tabs)
 */
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: any) => void;
}> = [];

/**
 * Circuit Breaker - In-Memory
 * Prevents infinite retry loops after refresh failure
 */
let circuitBreakerBlocked = false;
let circuitBreakerTime = 0;
let refreshAttemptCount = 0;
const MAX_REFRESH_ATTEMPTS = 3;
const COOLDOWN_MS = 5000; // 5 seconds

export const processQueue = (error: any, token: string | null = null) => {
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
 * Reset all auth state (circuit breaker, refresh flags)
 * ✅ CRITICAL FIX: Also clear cookies to prevent stale token issues
 */
export const resetAuthState = () => {
    circuitBreakerBlocked = false;
    circuitBreakerTime = 0;
    refreshAttemptCount = 0;
    isRefreshing = false;
    failedQueue = [];
};

/**
 * Check if circuit breaker is currently blocking refresh attempts
 */
export const isRefreshBlocked = (): boolean => {
    if (!circuitBreakerBlocked) return false;

    const timeSinceFailure = Date.now() - circuitBreakerTime;
    if (timeSinceFailure >= COOLDOWN_MS) {
        // Cooldown expired, allow retry
        circuitBreakerBlocked = false;
        circuitBreakerTime = 0;
        refreshAttemptCount = 0;
        return false;
    }

    return true;
};

/**
 * Set circuit breaker state
 */
export const setCircuitBreaker = (blocked: boolean) => {
    circuitBreakerBlocked = blocked;
    circuitBreakerTime = blocked ? Date.now() : 0;
};

/**
 * Get refresh state for use in interceptors
 */
export const getRefreshState = () => ({
    isRefreshing,
    refreshAttemptCount,
    MAX_REFRESH_ATTEMPTS,
    COOLDOWN_MS,
});

/**
 * Set refresh state (for use in interceptors)
 */
export const setRefreshState = (refreshing: boolean) => {
    isRefreshing = refreshing;
};

/**
 * Increment refresh attempt count
 */
export const incrementRefreshAttempt = () => {
    refreshAttemptCount++;
};

/**
 * Reset refresh attempt count
 */
export const resetRefreshAttempt = () => {
    refreshAttemptCount = 0;
};

/**
 * Add request to failed queue
 */
export const addToFailedQueue = (resolve: (value?: unknown) => void, reject: (reason?: any) => void) => {
    failedQueue.push({ resolve, reject });
};

/**
 * Check if refresh token cookie exists
 * ✅ Helps detect "Ghost ID" scenario where cookies are stale/missing
 */
export const hasRefreshTokenCookie = (): boolean => {
    if (typeof document === 'undefined') return false;

    const cookies = document.cookie.split(';');
    return cookies.some(cookie => {
        const name = cookie.trim().split('=')[0];
        return name === 'refreshToken' || name === '__Secure-refreshToken';
    });
};

/**
 * Check if access token cookie exists
 */
export const hasAccessTokenCookie = (): boolean => {
    if (typeof document === 'undefined') return false;

    const cookies = document.cookie.split(';');
    return cookies.some(cookie => {
        const name = cookie.trim().split('=')[0];
        return name === 'accessToken' || name === '__Secure-accessToken';
    });
};

/**
 * Detect "Ghost ID" scenario: refresh token exists but access token is missing
 * This indicates a stale session that needs refresh or re-login
 */
export const detectGhostSession = (): 'valid' | 'ghost' | 'no_session' => {
    const hasRefresh = hasRefreshTokenCookie();
    const hasAccess = hasAccessTokenCookie();

    if (!hasRefresh && !hasAccess) return 'no_session';
    if (hasRefresh && !hasAccess) return 'ghost';
    return 'valid';
};
