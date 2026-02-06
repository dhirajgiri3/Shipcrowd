'use client';

import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { User, AuthContextType, RegisterRequest, LoginRequest, NormalizedError } from '@/src/types/auth';
import { authApi, companyApi } from '@/src/core/api';
import { sessionApi } from '@/src/core/api/clients/auth/sessionApi';
import type { Session } from '@/src/core/api/clients/auth/sessionApi';
import { clearCSRFToken, prefetchCSRFToken, resetAuthState, isRefreshBlocked, normalizeError } from '@/src/core/api/http';
import { shouldSkipAuthInit, isGuestOnlyRoute } from '@/src/config/routes';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import { Loader } from '@/src/components/ui/feedback/Loader';

/**
 * Auth Context
 * Manages authentication state and provides auth methods
 * No race conditions, proper cleanup, CSRF management
 */
export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Auth Provider Component
 * Handles:
 * - User state management
 * - Auto-login on mount (check /auth/me)
 * - Token refresh every 14 minutes
 * - CSRF token initialization
 * - Clean error handling
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<NormalizedError | null>(null);

  // Refs for cleanup and preventing race conditions
  const initializeRef = useRef(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ Activity and Refresh Timing Refs
  const lastActivityRef = useRef(Date.now());
  const lastRefreshRef = useRef(Date.now());

  /**
   * Setup token refresh timer
   * Refresh token every 14 minutes (before 15 min access token expiry)
   * Works independently - no user check needed
   */
  /**
   * Setup token refresh timer
   * Smart Refresh: Checks every minute, refreshes if 14 mins passed AND user is active
   */
  /**
   * ✅ PRODUCTION-GRADE TOKEN REFRESH (Industry Best Practice)
   *
   * Key Principles:
   * 1. Fixed refresh cadence (9 mins) - runs BEFORE 15-min expiry
   * 2. NO activity-based logic - refresh token controls session lifespan
   * 3. Only stops when refresh fails (server decides validity)
   * 4. Circuit breaker prevents infinite retry loops
   *
   * This follows the same model as Google/GitHub/Stripe/Shopify
   */
  const setupTokenRefresh = useCallback(() => {
    // Clear existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // ✅ CRITICAL: Refresh every 9 mins (access token expires at 15 mins)
    // This provides 6-minute safety buffer and ensures no token expiry
    const REFRESH_INTERVAL = 9 * 60 * 1000; // 9 minutes

    const performRefresh = async () => {
      // ✅ Check circuit breaker before attempting refresh
      if (isRefreshBlocked()) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Auth] Refresh blocked by circuit breaker - stopping refresh loop');
        }
        // Clear interval to stop further attempts
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
        return;
      }

      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Auth] 🔄 Proactive token refresh', {
            timestamp: new Date().toLocaleTimeString(),
            interval: '9 minutes',
          });
        }

        // ✅ Call refresh endpoint - server decides if session is valid
        const response = await authApi.refreshToken();
        if (response?.data?.user) {
          setUser(response.data.user);
        }

        // Update last refresh time on success
        lastRefreshRef.current = Date.now();

        if (process.env.NODE_ENV === 'development') {
          console.log('[Auth] ✅ Token refresh successful');
        }
      } catch (err) {
        // ✅ Refresh failed - server rejected refresh token
        // This happens when:
        // - Refresh token expired (7 days default, 30 days with remember-me)
        // - User logged out from another device
        // - Token was revoked or blacklisted
        console.error('[Auth] Refresh failed - session expired', err);

        // Clear user state
        setUser(null);

        // Stop refresh loop
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }

        // ✅ FIX: Redirect to login with session expired message
        // This prevents the blank screen issue
        if (typeof window !== 'undefined') {
          // Clear any client-side auth state
          resetAuthState();

          // Redirect to login page
          window.location.href = '/login?session_expired=true';
        }
      }
    };

    // ✅ Reset timestamps
    lastRefreshRef.current = Date.now();
    lastActivityRef.current = Date.now();

    // ✅ Start fixed-cadence refresh (runs every 9 minutes regardless of activity)
    refreshIntervalRef.current = setInterval(performRefresh, REFRESH_INTERVAL);

    if (process.env.NODE_ENV === 'development') {
      console.log('[Auth] 🔐 Token refresh timer started (every 9 minutes)');
      console.log('[Auth] Session lifespan controlled by refresh token TTL (7-30 days)');
    }
  }, []);

  /**
   * Sync session state from cookies (used for cross-tab login events)
   * Keeps client in sync with server-set HttpOnly cookies
   */
  const syncSessionFromCookies = useCallback(async () => {
    try {
      const userData = await authApi.getMe();
      setUser(userData);
      setupTokenRefresh();
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Auth] Failed to sync session from cookies:', err);
      }
    }
  }, [setupTokenRefresh]);

  // ✅ Activity Listener setup
  useEffect(() => {
    const handleActivity = () => {
      // Throttle: Only update if significant time passed (e.g. 1 sec) or just raw is fine for Date.now()
      lastActivityRef.current = Date.now();
    };

    // Listen for user activity
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('scroll', handleActivity);

    // ✅ Cross-Tab Synchronization
    const authChannel = new BroadcastChannel('auth_channel');

    authChannel.onmessage = async (event) => {
      if (event.data.type === 'LOGOUT') {
        // Received LOGOUT from another tab
        // Only act if currently logged in to avoid loops
        if (user) {
          // ✅ Fix #8: Reset circuit breaker on cross-tab logout
          clearCSRFToken();
          resetAuthState();
          if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current);
            refreshIntervalRef.current = null;
          }
          if (process.env.NODE_ENV === 'development') {
            console.log('[Auth] Synced logout from another tab');
          }
          setUser(null);
        }
      } else if (event.data.type === 'LOGIN') {
        // Received LOGIN from another tab
        // Cookies are shared across tabs, so sync state
        await syncSessionFromCookies();
      }
    };

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      authChannel.close();
    };
  }, [user, syncSessionFromCookies]);

  /**
   * Initialize authentication on mount
   * Checks for existing session via /auth/me
   */
  const initializeAuth = useCallback(async () => {
    // Prevent multiple initializations
    if (initializeRef.current) return;
    initializeRef.current = true;

    try {
      // ✅ Skip auth init on public/guest-only routes to avoid unnecessary refresh attempts
      if (shouldSkipAuthInit(pathname)) {
        setIsInitialized(true);
        return;
      }
      // ✅ Pre-fetch CSRF token in background to ensure readiness for mutations
      prefetchCSRFToken().catch((err) => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Auth] CSRF prefetch failed:', err);
        }
      });

      // ✅ Allow refresh on init if access token is expired but refresh token is valid
      const userData = await authApi.getMe();
      setUser(userData);
      // ✅ Start auto-refresh timer for existing sessions
      setupTokenRefresh();
    } catch (err) {
      // User not authenticated - expected for public pages
      if (process.env.NODE_ENV === 'development') {
        console.log('[Auth] No active session');
      }
    } finally {
      setIsInitialized(true);
    }
  }, [pathname, setupTokenRefresh]);

  // Clear logout overlay once we've landed on login (or any guest page) after redirect.
  // Keeps "Signing out..." visible until navigation completes, avoiding flash of empty dashboard.
  useEffect(() => {
    if (pathname && isGuestOnlyRoute(pathname)) {
      setIsLoggingOut(false);
    }
  }, [pathname]);

  /**
   * Refresh user data from server
   * Can be called manually to sync user state
   */
  const refreshUser = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const userData = await authApi.getMe();
      setUser(userData);
      // ✅ Ensure token refresh timer is running (OAuth/magic-link flows use refreshUser)
      setupTokenRefresh();
    } catch (err) {
      const normalizedErr = normalizeError(err as any);
      setError(normalizedErr);
      setUser(null);
      // Stop refresh loop if session is invalid
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    } finally {
      setIsLoading(false);
    }
  }, [setupTokenRefresh]);

  /**
   * Register new user
   */
  const register = useCallback(
    async (data: RegisterRequest) => {
      try {
        setIsLoading(true);
        setError(null);

        await authApi.register(data);

        return { success: true };
      } catch (err) {
        const normalizedErr = normalizeError(err as any);
        setError(normalizedErr);
        return { success: false, error: normalizedErr };
      } finally {
        setIsLoading(false);
      }
    },
    [setupTokenRefresh]
  );

  /**
   * Login user
   */
  const login = useCallback(
    async (data: LoginRequest) => {
      try {
        setIsLoading(true);
        setError(null);

        // ✅ Fix #2: Reset circuit breaker on login
        resetAuthState();

        const response = await authApi.login(data);
        const userData = response.data.user;

        // ✅ Security: Rotate CSRF token on login to prevent session fixation
        clearCSRFToken();
        prefetchCSRFToken().catch(console.warn);

        setUser(userData);
        // ✅ Update activity timestamp on login
        lastActivityRef.current = Date.now();
        setupTokenRefresh(); // Start refresh timer on successful login

        // ✅ Broadcast LOGIN event to other tabs (ONLY on success)
        try {
          const authChannel = new BroadcastChannel('auth_channel');
          authChannel.postMessage({ type: 'LOGIN' });
          authChannel.close();
        } catch (broadcastError) {
          // BroadcastChannel may not be supported in all environments
          if (process.env.NODE_ENV === 'development') {
            console.warn('[Auth] BroadcastChannel not available:', broadcastError);
          }
        }

        showSuccessToast('Welcome back!');
        return { success: true, user: userData };
      } catch (err) {
        const normalizedErr = normalizeError(err as any);
        setError(normalizedErr);
        return { success: false, error: normalizedErr };
      } finally {
        setIsLoading(false);
      }
    },
    [setupTokenRefresh]
  );

  /**
   * Logout user
   * Clears all auth state, cookies, and broadcasts to other tabs
   * Caller is responsible for redirecting to login page
   */
  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    // ✅ Clear CSRF token BEFORE logout request to get fresh token
    clearCSRFToken();

    try {
      // Call logout endpoint (may fail - keep session intact if it does)
      await authApi.logout();

      // Stop token refresh immediately (only after successful logout)
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }

      // Clear user state
      setUser(null);

      // ✅ Reset auth state (clears cookies, circuit breaker)
      resetAuthState();

      // ✅ Broadcast LOGOUT event to other tabs
      try {
        const authChannel = new BroadcastChannel('auth_channel');
        authChannel.postMessage({ type: 'LOGOUT' });
        authChannel.close();
      } catch {
        // BroadcastChannel may not be available
      }
    } catch (logoutError) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Auth] Server logout failed:', logoutError);
      }
      setIsLoggingOut(false);
      throw logoutError;
    }
    // Do NOT set isLoggingOut(false) here - keep overlay until we've navigated to login.
    // useLogoutRedirect calls router.replace(redirectTo) after this; clearing too early
    // causes the previous page to flash with empty/fallback data before redirect completes.
  }, []);

  /**
   * Verify email with token
   */
  const verifyEmail = useCallback(
    async (token: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await authApi.verifyEmail(token);

        // ✅ If auto-login is enabled, fetch full user data to ensure state consistency
        if (response.autoLogin && response.user) {
          // Fetch authoritative user data from backend (includes all V5 fields)
          const userData = await authApi.getMe();
          setUser(userData);
          // ✅ Start refresh timer after auto-login (email verify flow)
          setupTokenRefresh();

          // Broadcast login to other tabs via BroadcastChannel
          const authChannel = new BroadcastChannel('auth_channel');
          authChannel.postMessage({ type: 'LOGIN', user: userData });
          authChannel.close();
        }

        return { success: true, data: response };
      } catch (err) {
        const normalizedErr = normalizeError(err as any);
        setError(normalizedErr);
        return { success: false, error: normalizedErr };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );


  /**
   * Resend verification email
   */
  const resendVerification = useCallback(
    async (email: string) => {
      try {
        setIsLoading(true);
        setError(null);

        await authApi.resendVerification(email);

        return { success: true };
      } catch (err) {
        const normalizedErr = normalizeError(err as any);
        setError(normalizedErr);
        return { success: false, error: normalizedErr };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Request password reset
   */
  const resetPassword = useCallback(
    async (email: string) => {
      try {
        setIsLoading(true);
        setError(null);

        await authApi.resetPassword(email);

        return { success: true };
      } catch (err) {
        const normalizedErr = normalizeError(err as any);
        setError(normalizedErr);
        return { success: false, error: normalizedErr };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Confirm password reset with token and new password
   */
  const resetPasswordConfirm = useCallback(
    async (token: string, newPassword: string) => {
      try {
        setIsLoading(true);
        setError(null);

        await authApi.resetPasswordConfirm(token, newPassword);

        return { success: true };
      } catch (err) {
        const normalizedErr = normalizeError(err as any);
        setError(normalizedErr);
        return { success: false, error: normalizedErr };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Change password for authenticated user
   */
  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      try {
        setIsLoading(true);
        setError(null);

        await authApi.changePassword(currentPassword, newPassword);

        return { success: true };
      } catch (err) {
        const normalizedErr = normalizeError(err as any);
        setError(normalizedErr);
        return { success: false, error: normalizedErr };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Clear error manually (for form submission retry)
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ========================================================================
  // SETTINGS PAGE STUBS (To be implemented with real API)
  // ========================================================================

  const [sessions, setSessions] = useState<any[]>([]);

  /**
   * Change email - Real backend implementation
   */
  const changeEmail = useCallback(async (data: { newEmail: string; password?: string }) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await authApi.changeEmail(data.newEmail, data.password);

      showSuccessToast('Verification email sent to new address. Please check your inbox.');
      return { success: true };
    } catch (err) {
      const normalizedErr = normalizeError(err as any);
      setError(normalizedErr);
      handleApiError(err, 'Failed to change email');
      return { success: false, error: normalizedErr.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Create Company
   * Creates a new company for the authenticated user and updates their profile
   */
  const createCompany = useCallback(async (data: {
    name: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
    billingInfo?: {
      gstin?: string;
      pan?: string;
    };
  }) => {
    try {
      setIsLoading(true);
      setError(null);

      // Call company creation API
      const response = await companyApi.createCompany(data);

      // Fetch updated user data (backend sets new token with companyId)
      const updatedUser = await authApi.getMe();

      // Update state
      setUser(updatedUser);

      showSuccessToast(response.message || 'Company created successfully!');

      return { success: true, company: response.company };
    } catch (err) {
      const normalizedErr = normalizeError(err as any);
      setError(normalizedErr);
      handleApiError(err, 'Failed to create company');
      return { success: false, error: normalizedErr };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load user sessions
   */
  const loadSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const sessions = await sessionApi.getSessions();
      setSessions(sessions);
    } catch (err) {
      const normalizedErr = normalizeError(err as any);
      setError(normalizedErr);
      setSessions([]);
      handleApiError(err, 'Failed to load sessions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Revoke specific session
   */
  const revokeSession = useCallback(async (sessionId: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      setIsLoading(true);
      setError(null);

      await sessionApi.revokeSession(sessionId);

      // Refresh sessions list
      await loadSessions();

      showSuccessToast('Session revoked successfully');
      return { success: true };
    } catch (err) {
      const normalizedErr = normalizeError(err as any);
      setError(normalizedErr);
      handleApiError(err, 'Failed to revoke session. Please try again.');
      return { success: false, error: normalizedErr.message };
    } finally {
      setIsLoading(false);
    }
  }, [loadSessions]);

  /**
   * Revoke all other sessions
   */
  const revokeAllSessions = useCallback(async (): Promise<{ success: boolean; message?: string; revokedCount?: number; error?: string }> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await sessionApi.revokeAllSessions();

      // Refresh sessions list
      await loadSessions();

      showSuccessToast(`${result.revoked} session(s) revoked successfully`);
      return { success: true, revokedCount: result.revoked };
    } catch (err) {
      const normalizedErr = normalizeError(err as any);
      setError(normalizedErr);
      handleApiError(err, 'Failed to revoke sessions. Please try again.');
      return { success: false, error: normalizedErr.message };
    } finally {
      setIsLoading(false);
    }
  }, [loadSessions]);

  // Note: Password strength check moved to backend API
  // Use authApi.checkPasswordStrength() directly in components

  /**
   * Initialize auth on mount
   */
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    isInitialized,
    isLoggingOut,
    error,
    register,
    login,
    logout,
    refreshUser,
    verifyEmail,
    resendVerification,
    resetPassword,
    resetPasswordConfirm,
    changePassword,
    clearError,
    // Settings page methods
    changeEmail,
    createCompany,
    sessions,
    loadSessions,
    revokeSession,
    revokeAllSessions,
    // Password strength check: Use authApi.checkPasswordStrength() directly
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {isLoggingOut && (
        <div className="fixed inset-0 z-[110] bg-black/30 backdrop-blur-sm flex items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl bg-[var(--bg-primary)]/95 border border-[var(--border-subtle)] px-5 py-3 shadow-lg">
            <Loader variant="spinner" size="sm" />
            <span className="text-sm font-medium text-[var(--text-primary)]">Signing out...</span>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
