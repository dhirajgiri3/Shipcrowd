# Authentication Infinite Loop Fix - Implementation Plan

## Executive Summary

The frontend authentication system is experiencing an infinite request loop after the refresh token expires. Analysis reveals **5 critical issues** in the authentication flow that need immediate fixes.

**Severity**: 🔴 Critical - Application becomes unusable
**Impact**: Infinite API requests, dashboard refresh loop, poor UX
**Root Cause**: Missing circuit breaker after failed token refresh

---

## Problem Statement

### Observable Symptoms

From server logs (16:49:21 onwards):
```
GET /api/v1/auth/me → 401 Unauthorized
POST /api/v1/auth/refresh → 401 Invalid refresh token
[REPEATS INFINITELY - 30+ times in 30 seconds]
```

This causes:
- Dashboard page refreshes infinitely
- Hundreds of failed API requests per minute
- User cannot interact with the application
- Server load increases unnecessarily

### When It Happens

1. **Initial login works fine**: User can log in, access dashboard, make API calls
2. **After ~15-20 minutes of inactivity**: Refresh token expires (backend default: 7 days but cookie may be cleared earlier)
3. **On next API call**: Gets 401 → Tries to refresh → Also 401 → **INFINITE LOOP**
4. **Persists even after manual login**: Because the loop prevention state isn't reset

---

## Root Cause Analysis

### Issue #1: No Global Circuit Breaker (CRITICAL)

**File**: `client/src/core/api/client.ts`
**Lines**: 214-286 (Response Interceptor)

**Problem**:
```typescript
// Current implementation
if (
    error.response?.status === 401 &&
    !originalRequest._retry &&  // ❌ Only prevents SAME request from retrying
    !isUrlPath(originalRequest.url, '/auth/refresh') &&
    !isUrlPath(originalRequest.url, '/auth/login')
) {
    // Attempt refresh...
}
```

**Why it fails**:
- `originalRequest._retry` only applies to the CURRENT request
- **NEW requests** from AuthContext or components don't have this flag
- After refresh fails once, the NEXT request triggers the same cycle
- No global state to say "refresh has already failed, stop trying"

**Example Flow**:
```
Request A: GET /auth/me
  → 401, set _retry=true, try refresh
  → Refresh FAILS with 401
  → Request A is rejected

Request B: GET /auth/me (triggered by interval check)
  → 401, _retry is NOT set (new request!)
  → Try refresh AGAIN
  → Refresh FAILS with 401
  → Request B is rejected

Request C: GET /auth/me (triggered by component mount)
  → INFINITE LOOP CONTINUES
```

---

### Issue #2: Token Refresh Queue Race Condition

**File**: `client/src/core/api/client.ts`
**Lines**: 234-244

**Problem**:
```typescript
if (isRefreshing) {
    return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
    })
    .then(() => {
        return client(originalRequest);  // ❌ Retries with FAILED credentials
    });
}
```

**Why it fails**:
- When refresh FAILS, queued requests are rejected (line 264: `processQueue(refreshError)`)
- BUT they don't have `_retry` flag set on their `originalRequest`
- So they trigger the 401 handler AGAIN
- Creates secondary infinite loop from queued requests

---

### Issue #3: AuthContext Interval Creates New Requests

**File**: `client/src/features/auth/context/AuthContext.tsx`
**Lines**: 131-172

**Problem**:
```typescript
refreshIntervalRef.current = setInterval(async () => {
    // Runs every 60 seconds
    if (timeSinceRefresh >= REFRESH_THRESHOLD) {
        try {
            await authApi.refreshToken();  // ❌ Creates NEW request every minute
            const userData = await authApi.getMe();
        } catch (err) {
            // Cleanup happens, but damage is done
        }
    }
}, 60 * 1000);
```

**Why it fails**:
- Interval checks EVERY minute if refresh is needed (14-minute threshold)
- Each check creates a NEW `/auth/me` request
- If refresh token is invalid, EVERY minute triggers a new loop cycle
- Even though cleanup happens in catch block, the request already went through the interceptor

---

### Issue #4: No Refresh Attempt Counter

**Current State**:
- No tracking of how many times refresh has been attempted
- No exponential backoff
- No maximum retry limit

**Impact**:
- Even if we prevent immediate retries, rapid-fire requests can still trigger multiple refresh attempts
- No protection against thundering herd if multiple tabs/components make concurrent requests

---

### Issue #5: Refresh State Not Reset on Login

**File**: `client/src/features/auth/context/AuthContext.tsx`
**Lines**: 249-268 (login method)

**Problem**:
```typescript
const login = async (data: LoginData) => {
    const response = await authApi.login(data);
    const userData = response.data.user;
    setUser(userData);
    setupTokenRefresh();  // ❌ Sets up interval, but doesn't reset retry state
};
```

**Why it fails**:
- If user logs in AFTER the infinite loop has started
- The global "refresh failed" state persists
- New session's refresh attempts might be blocked by stale failure state

---

## Proposed Solution

### Phase 1: Add Global Circuit Breaker (CRITICAL - Must implement first)

**File**: `client/src/core/api/client.ts`

**Changes**:

```typescript
// Add global state variables (after line 22)
let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

// NEW: Circuit breaker state
let refreshFailedPermanently = false;
let lastRefreshFailureTime: number | null = null;
let refreshAttemptCount = 0;
const MAX_REFRESH_ATTEMPTS = 3;
const REFRESH_COOLDOWN_MS = 5000; // 5 seconds cooldown after failure

// NEW: Export reset function
export const resetAuthState = () => {
    refreshFailedPermanently = false;
    lastRefreshFailureTime = null;
    refreshAttemptCount = 0;
    isRefreshing = false;
    failedQueue = [];
};

// Update 401 interceptor (line 225-286)
client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // NEW: Early exit if refresh has permanently failed
        if (refreshFailedPermanently) {
            const timeSinceFailure = Date.now() - (lastRefreshFailureTime || 0);

            // Only allow retry after cooldown period
            if (timeSinceFailure < REFRESH_COOLDOWN_MS) {
                console.warn('[Auth] Refresh permanently failed, blocking retry');
                return Promise.reject(normalizeError(error));
            } else {
                // Reset after cooldown
                refreshFailedPermanently = false;
                refreshAttemptCount = 0;
            }
        }

        // NEW: Check attempt counter
        if (refreshAttemptCount >= MAX_REFRESH_ATTEMPTS) {
            console.error('[Auth] Max refresh attempts reached');
            refreshFailedPermanently = true;
            lastRefreshFailureTime = Date.now();
            return Promise.reject(normalizeError(error));
        }

        // Existing 401 check (with added circuit breaker check)
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !refreshFailedPermanently &&  // NEW: Check circuit breaker
            !isUrlPath(originalRequest.url, '/auth/refresh') &&
            !isUrlPath(originalRequest.url, '/auth/login')
        ) {
            originalRequest._retry = true;

            // Queue handling (existing code)
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(() => client(originalRequest))
                    .catch((err) => Promise.reject(err));
            }

            isRefreshing = true;
            refreshAttemptCount++; // NEW: Increment counter

            try {
                console.log(`[Auth] Attempting token refresh (attempt ${refreshAttemptCount}/${MAX_REFRESH_ATTEMPTS})`);

                await client.post('/auth/refresh');

                // NEW: Reset on success
                refreshAttemptCount = 0;
                refreshFailedPermanently = false;
                lastRefreshFailureTime = null;

                processQueue(null);
                isRefreshing = false;
                return client(originalRequest);
            } catch (refreshError) {
                // NEW: Set circuit breaker on failure
                console.error('[Auth] Token refresh failed', refreshError);
                refreshFailedPermanently = true;
                lastRefreshFailureTime = Date.now();

                processQueue(refreshError, null);
                isRefreshing = false;

                // Existing redirect logic
                const currentPath = window.location.pathname;
                if (!shouldNotRedirectOnAuthFailure(currentPath)) {
                    console.log('[Auth] Redirecting to login due to auth failure');
                    window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
                }

                return Promise.reject(normalizeError(refreshError));
            }
        }

        return Promise.reject(normalizeError(error));
    }
);
```

**Impact**:
- ✅ Prevents infinite loop by blocking retries after failure
- ✅ Allows recovery after 5-second cooldown
- ✅ Limits max attempts to 3
- ✅ Provides clear logging for debugging

---

### Phase 2: Reset Circuit Breaker on Login

**File**: `client/src/features/auth/context/AuthContext.tsx`

**Changes**:

```typescript
// Add import (line 4)
import { resetAuthState } from '@/src/core/api/client';

// Update login method (line 249)
const login = async (data: LoginData) => {
    console.log('[Auth] Logging in...');

    // NEW: Reset auth state before login
    resetAuthState();

    const response = await authApi.login(data);
    const userData = response.data.user;

    setUser(userData);
    setupTokenRefresh();

    console.log('[Auth] Login successful', userData.email);
};

// Update logout method (line 272)
const logout = async () => {
    console.log('[Auth] Logging out...');

    try {
        await authApi.logout();
    } catch (error) {
        console.error('[Auth] Logout error:', error);
    } finally {
        // NEW: Reset auth state on logout
        resetAuthState();

        setUser(null);

        if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current);
            refreshIntervalRef.current = null;
        }
    }
};
```

**Impact**:
- ✅ Fresh session gets clean slate
- ✅ Previous session's failure state doesn't affect new login
- ✅ Logout clears all auth state properly

---

### Phase 3: Debounce Refresh Interval Checks

**File**: `client/src/features/auth/context/AuthContext.tsx`

**Changes**:

```typescript
// Update setupTokenRefresh (line 131)
const setupTokenRefresh = useCallback(() => {
    if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
    }

    refreshIntervalRef.current = setInterval(async () => {
        const now = Date.now();
        const timeSinceRefresh = now - lastRefreshRef.current;
        const timeSinceActivity = now - lastActivityRef.current;

        const REFRESH_THRESHOLD = 14 * 60 * 1000;
        const INACTIVITY_TIMEOUT = 20 * 60 * 1000;

        if (timeSinceRefresh >= REFRESH_THRESHOLD) {
            if (timeSinceActivity < INACTIVITY_TIMEOUT) {
                try {
                    console.log('[Auth] Refreshing token (Active Session)');

                    // NEW: Check if we should skip refresh (circuit breaker active)
                    const shouldRefresh = await checkShouldRefresh();
                    if (!shouldRefresh) {
                        console.warn('[Auth] Skipping refresh - circuit breaker active');
                        // Clear interval to stop further attempts
                        if (refreshIntervalRef.current) {
                            clearInterval(refreshIntervalRef.current);
                            refreshIntervalRef.current = null;
                        }
                        return;
                    }

                    await authApi.refreshToken();
                    const userData = await authApi.getMe();
                    setUser(userData);
                    lastRefreshRef.current = Date.now();
                } catch (err) {
                    console.error('[Auth] Refresh failed', err);
                    setUser(null);

                    // Existing cleanup
                    if (refreshIntervalRef.current) {
                        clearInterval(refreshIntervalRef.current);
                        refreshIntervalRef.current = null;
                    }
                }
            } else {
                console.log('[Auth] Clearing interval (Inactive Session)');
                if (refreshIntervalRef.current) {
                    clearInterval(refreshIntervalRef.current);
                    refreshIntervalRef.current = null;
                }
            }
        }
    }, 60 * 1000);
}, []);

// NEW: Helper function to check circuit breaker state
const checkShouldRefresh = async (): Promise<boolean> => {
    // Import circuit breaker state check from client.ts
    // Return false if refreshFailedPermanently is true
    // This requires exporting a getter from client.ts
    return true; // Placeholder - will implement in client.ts
};
```

**In `client.ts`**, add getter:

```typescript
// NEW: Export getter for circuit breaker state
export const isRefreshBlocked = (): boolean => {
    if (!refreshFailedPermanently) return false;

    const timeSinceFailure = Date.now() - (lastRefreshFailureTime || 0);
    return timeSinceFailure < REFRESH_COOLDOWN_MS;
};
```

**Then in AuthContext**:

```typescript
import { isRefreshBlocked } from '@/src/core/api/client';

const checkShouldRefresh = (): boolean => {
    return !isRefreshBlocked();
};
```

**Impact**:
- ✅ Prevents interval from triggering refresh when circuit breaker is active
- ✅ Stops the interval entirely after first failure (user must re-login)
- ✅ Reduces unnecessary API calls

---

### Phase 4: Add Request Deduplication

**File**: `client/src/core/api/client.ts`

**Changes**:

```typescript
// NEW: Request deduplication cache (after line 22)
const pendingRequests = new Map<string, Promise<any>>();

// NEW: Helper to generate request key
const getRequestKey = (config: any): string => {
    return `${config.method}:${config.url}:${JSON.stringify(config.params || {})}`;
};

// Update request interceptor (line 189)
client.interceptors.request.use(
    async (config) => {
        // Existing CSRF logic
        await ensureCSRFToken(config);

        // NEW: Deduplicate identical concurrent requests
        const requestKey = getRequestKey(config);

        // Skip deduplication for auth endpoints and POST/PUT/DELETE
        const shouldDeduplicate =
            config.method?.toLowerCase() === 'get' &&
            !isUrlPath(config.url, '/auth/');

        if (shouldDeduplicate && pendingRequests.has(requestKey)) {
            console.log('[API] Deduplicating request:', requestKey);
            return pendingRequests.get(requestKey)!;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Update response interceptor to clean up cache
client.interceptors.response.use(
    (response) => {
        // NEW: Remove from pending cache on success
        const requestKey = getRequestKey(response.config);
        pendingRequests.delete(requestKey);
        return response;
    },
    async (error) => {
        // NEW: Remove from pending cache on error
        if (error.config) {
            const requestKey = getRequestKey(error.config);
            pendingRequests.delete(requestKey);
        }

        // Existing 401 handler...
    }
);
```

**Impact**:
- ✅ Prevents duplicate `/auth/me` calls if triggered simultaneously
- ✅ Reduces server load
- ✅ Improves performance

---

### Phase 5: Add Visual Feedback & Error Boundaries

**File**: `client/src/features/auth/components/AuthGuard.tsx`

**Changes**:

```typescript
// Add state for auth error (after line 15)
const [authError, setAuthError] = useState<string | null>(null);

// Update useEffect (line 30)
useEffect(() => {
    if (!isInitialized) return;

    if (!user) {
        // NEW: Check if we're in an error state
        const searchParams = new URLSearchParams(window.location.search);
        const authErrorParam = searchParams.get('auth_error');

        if (authErrorParam === 'session_expired') {
            setAuthError('Your session has expired. Please log in again.');
        }

        // Existing redirect logic
        if (!isPublicRoute && !isGuestOnlyRoute) {
            const currentPath = window.location.pathname;
            router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
        }
    }
}, [user, isInitialized, pathname, router]);

// NEW: Show error message if auth failed
if (authError && !user) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900 text-center">
                    Authentication Error
                </h3>
                <p className="mt-2 text-sm text-gray-500 text-center">
                    {authError}
                </p>
                <button
                    onClick={() => {
                        setAuthError(null);
                        router.push('/login');
                    }}
                    className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                    Go to Login
                </button>
            </div>
        </div>
    );
}
```

**Update redirect in `client.ts`** (line 279):

```typescript
// Instead of just redirecting
window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;

// Add error indicator
window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}&auth_error=session_expired`;
```

**Impact**:
- ✅ User sees clear error message instead of infinite spinner
- ✅ Provides explicit "session expired" feedback
- ✅ Better UX during auth failures

---

## Additional Optimizations

### Optimization 1: Add Refresh Token Validation Before Use

**File**: `client/src/core/api/auth.api.ts`

```typescript
// NEW: Check if refresh token exists before attempting refresh
export const canRefreshToken = (): boolean => {
    // Check if refresh token cookie exists
    const cookies = document.cookie.split(';');
    const hasRefreshToken = cookies.some(cookie =>
        cookie.trim().startsWith('refreshToken=')
    );
    return hasRefreshToken;
};

export const refreshToken = async (): Promise<void> => {
    // NEW: Validate before making request
    if (!canRefreshToken()) {
        throw new Error('No refresh token available');
    }

    const response = await client.post('/auth/refresh');
    return response.data;
};
```

**Update client.ts** interceptor:

```typescript
// Before attempting refresh (line 250)
if (!canRefreshToken()) {
    console.warn('[Auth] No refresh token available, skipping refresh');
    refreshFailedPermanently = true;
    lastRefreshFailureTime = Date.now();

    const currentPath = window.location.pathname;
    if (!shouldNotRedirectOnAuthFailure(currentPath)) {
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}&auth_error=no_token`;
    }

    return Promise.reject(new Error('No refresh token'));
}

await client.post('/auth/refresh');
```

**Impact**:
- ✅ Avoids unnecessary network requests when no refresh token exists
- ✅ Fails fast with clear error
- ✅ Improves performance

---

### Optimization 2: Add Exponential Backoff to Refresh Attempts

**File**: `client/src/core/api/client.ts`

```typescript
// Update refresh attempt logic (line 245)
const getBackoffDelay = (attemptNumber: number): number => {
    // Exponential backoff: 1s, 2s, 4s
    return Math.min(1000 * Math.pow(2, attemptNumber - 1), 4000);
};

// Before refresh attempt
if (refreshAttemptCount > 1) {
    const delay = getBackoffDelay(refreshAttemptCount);
    console.log(`[Auth] Waiting ${delay}ms before retry ${refreshAttemptCount}`);
    await new Promise(resolve => setTimeout(resolve, delay));
}

try {
    await client.post('/auth/refresh');
    // ...
}
```

**Impact**:
- ✅ Reduces server load during failures
- ✅ Gives backend time to recover
- ✅ More resilient to transient errors

---

### Optimization 3: Add Session Health Check

**File**: `client/src/features/auth/context/AuthContext.tsx`

```typescript
// NEW: Validate session health before making requests
const checkSessionHealth = useCallback(async (): Promise<boolean> => {
    try {
        // Lightweight health check - just validate token without full user data
        const response = await client.get('/auth/health', {
            timeout: 3000,
            headers: { 'X-Skip-Interceptor': 'true' } // Skip 401 interceptor
        });
        return response.status === 200;
    } catch {
        return false;
    }
}, []);

// Update initializeAuth (line 178)
const initializeAuth = useCallback(async () => {
    if (initializeRef.current) return;
    initializeRef.current = true;

    try {
        console.log('[Auth] Initializing auth...');

        // NEW: Check session health first
        const isHealthy = await checkSessionHealth();
        if (!isHealthy) {
            console.warn('[Auth] Session unhealthy, skipping full init');
            setIsInitialized(true);
            return;
        }

        const userData = await authApi.getMe();
        // ... existing code
    }
}, [setupTokenRefresh, checkSessionHealth]);
```

**Backend endpoint needed**: `/api/v1/auth/health` (lightweight check)

**Impact**:
- ✅ Prevents full initialization when session is clearly dead
- ✅ Faster failure detection
- ✅ Reduces unnecessary requests

---

## Implementation Order

### Priority 1: CRITICAL (Implement immediately to stop infinite loop)

1. **Phase 1: Add Global Circuit Breaker** - Stops the bleeding
   - File: `client/src/core/api/client.ts`
   - Time: 30 minutes
   - Risk: Low

2. **Phase 2: Reset Circuit Breaker on Login** - Ensures recovery
   - File: `client/src/features/auth/context/AuthContext.tsx`
   - Time: 15 minutes
   - Risk: Low

### Priority 2: HIGH (Implement same session to prevent recurrence)

3. **Phase 3: Debounce Refresh Interval** - Prevents interval-triggered loops
   - File: `client/src/features/auth/context/AuthContext.tsx`
   - Time: 20 minutes
   - Risk: Medium

4. **Phase 5: Add Visual Feedback** - Improves UX
   - Files: `AuthGuard.tsx`, `client.ts`
   - Time: 25 minutes
   - Risk: Low

### Priority 3: MEDIUM (Next sprint for optimization)

5. **Optimization 1: Token Validation** - Performance improvement
   - Time: 20 minutes
   - Risk: Low

6. **Phase 4: Request Deduplication** - Reduces load
   - Time: 30 minutes
   - Risk: Medium (affects all GET requests)

### Priority 4: LOW (Nice to have)

7. **Optimization 2: Exponential Backoff** - Resilience
   - Time: 15 minutes
   - Risk: Low

8. **Optimization 3: Session Health Check** - Advanced optimization
   - Time: 30 minutes (including backend)
   - Risk: Medium (requires backend changes)

---

## Testing Plan

### Test Case 1: Expired Refresh Token

**Steps**:
1. Login successfully
2. Manually delete `refreshToken` cookie (DevTools)
3. Wait for interval check OR navigate to new page
4. **Expected**: Circuit breaker triggers, shows error, redirects to login
5. **Should NOT see**: Infinite loop of requests

### Test Case 2: Recovery After Failure

**Steps**:
1. Trigger circuit breaker (delete refresh token, wait for loop)
2. Login again with valid credentials
3. **Expected**: Circuit breaker resets, new session works normally
4. **Should NOT see**: Previous failure state affecting new session

### Test Case 3: Concurrent Requests

**Steps**:
1. Login successfully
2. Delete refresh token
3. Quickly open 3 different pages that make API calls
4. **Expected**: Only 1 refresh attempt, all requests fail gracefully
5. **Should NOT see**: 3 separate refresh attempts

### Test Case 4: Cooldown Period

**Steps**:
1. Trigger circuit breaker
2. Wait 5 seconds
3. Make new API call
4. **Expected**: Circuit breaker resets, allows retry
5. **Should NOT see**: Permanent block

### Test Case 5: Max Retry Limit

**Steps**:
1. Simulate flaky network (refresh sometimes succeeds)
2. Make API calls
3. **Expected**: Max 3 refresh attempts, then circuit breaker triggers
4. **Should NOT see**: Infinite retries

---

## Monitoring & Debugging

### Add Logging

```typescript
// In client.ts, add structured logging
const logger = {
    refreshAttempt: (attempt: number, max: number) => {
        console.log(`[Auth] Refresh attempt ${attempt}/${max}`);
    },
    circuitBreakerTripped: () => {
        console.error('[Auth] 🚨 Circuit breaker TRIPPED - blocking further refresh attempts');
    },
    circuitBreakerReset: () => {
        console.log('[Auth] ✅ Circuit breaker RESET');
    },
    refreshSuccess: () => {
        console.log('[Auth] ✅ Token refresh SUCCESS');
    },
    refreshFailed: (error: any) => {
        console.error('[Auth] ❌ Token refresh FAILED:', error.message);
    }
};
```

### Add Performance Tracking

```typescript
// Track refresh performance
let refreshMetrics = {
    totalAttempts: 0,
    successfulRefreshes: 0,
    failedRefreshes: 0,
    circuitBreakerTrips: 0,
    averageRefreshTime: 0
};

// Log metrics periodically
if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
        console.table(refreshMetrics);
    }, 60000); // Every minute
}
```

---

## Rollback Plan

If issues arise after deployment:

1. **Immediate**: Revert `client.ts` changes
2. **Temporary fix**: Add simple counter in localStorage:
   ```typescript
   const failCount = parseInt(localStorage.getItem('refresh_fail_count') || '0');
   if (failCount > 3) {
       // Block refresh
   }
   ```
3. **Monitor**: Check server logs for reduced request volume
4. **Restore**: Once verified, re-apply changes incrementally

---

## Success Metrics

After implementation, monitor:

1. **Request Volume**: `/auth/refresh` calls should drop to ~0 after expiration
2. **Error Rate**: 401 errors should not repeat infinitely
3. **User Experience**: No more infinite dashboard refreshes
4. **Server Load**: Reduced CPU/network usage during auth failures
5. **Login Success Rate**: Successful recovery after session expiry

**Target**: Zero infinite loops detected in 1 week of production use

---

## Files to Modify

### Critical Path (Must modify):
1. ✅ `client/src/core/api/client.ts` - Add circuit breaker, retry limit, deduplication
2. ✅ `client/src/features/auth/context/AuthContext.tsx` - Reset state, debounce interval
3. ✅ `client/src/features/auth/components/AuthGuard.tsx` - Error feedback
4. ✅ `client/src/core/api/auth.api.ts` - Token validation

### Supporting (Nice to have):
5. `server/src/presentation/http/routes/v1/auth/auth.routes.ts` - Health check endpoint (optional)

---

## Estimated Time

- **Critical Fixes (Priority 1-2)**: 1.5 hours
- **Optimizations (Priority 3-4)**: 2 hours
- **Testing**: 1 hour
- **Documentation**: 30 minutes

**Total**: ~5 hours for complete implementation

---

## Next Steps

1. ✅ Review this plan
2. ✅ Get approval for critical fixes (Priority 1-2)
3. ✅ Implement Phase 1 (circuit breaker)
4. ✅ Test in development
5. ✅ Deploy to staging
6. ✅ Monitor for 24 hours
7. ✅ Deploy to production
8. ✅ Implement remaining optimizations

---

**Plan Status**: ✅ Ready for Implementation
**Last Updated**: 2026-01-06
**Version**: 1.0
