'use client';

import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import type { User, AuthContextType, RegisterRequest, LoginRequest, NormalizedError } from '@/src/types/auth';
import { authApi } from '@/src/core/api/clients/authApi';
import { sessionApi, type Session } from '@/src/core/api/clients/sessionApi';
import { companyApi } from '@/src/core/api/clients/companyApi';
import { clearCSRFToken, prefetchCSRFToken, resetAuthState, isRefreshBlocked, normalizeError } from '@/src/core/api/client';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<NormalizedError | null>(null);

  // Refs for cleanup and preventing race conditions
  const initializeRef = useRef(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ Activity and Refresh Timing Refs
  const lastActivityRef = useRef(Date.now());
  const lastRefreshRef = useRef(Date.now());

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
        // Silently ignore - cookies are not shared across tabs in browsers
        // Each tab maintains its own auth state
        if (process.env.NODE_ENV === 'development') {
          console.log('[Auth] Login event received from another tab (ignored - cookies not shared)');
        }
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
  }, [user]);

  /**
   * Setup token refresh timer
   * Refresh token every 14 minutes (before 15 min access token expiry)
   * Works independently - no user check needed
   */
  /**
   * Setup token refresh timer
   * Smart Refresh: Checks every minute, refreshes if 14 mins passed AND user is active
   */
  const setupTokenRefresh = useCallback(() => {
    // Clear existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // CONFIG: Refresh every 10 mins (access token expires at 15 mins)
    // This gives 5 minutes buffer and handles page reloads gracefully
    const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

    // Perform refresh immediately on first call (if needed)
    const performRefresh = async () => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivityRef.current;

      // ✅ FIX: Only skip refresh if user has been completely inactive for >30 mins
      // This prevents token expiry during normal idle periods (15-20 mins)
      const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

      if (timeSinceActivity >= INACTIVITY_TIMEOUT) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Auth] Skipping refresh - User inactive for 30+ minutes');
        }
        return;
      }

      // Check circuit breaker before attempting refresh
      if (isRefreshBlocked()) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Auth] Skipping refresh - circuit breaker active');
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
          console.log('[Auth] Refreshing token (Active Session)', {
            timeSinceActivity: Math.floor(timeSinceActivity / 1000),
            timestamp: new Date().toLocaleTimeString(),
          });
        }

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
        // Token refresh failed - session expired
        console.error('[Auth] Refresh failed', err);
        setUser(null);
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      }
    };

    // Reset timestamps
    lastRefreshRef.current = Date.now();
    lastActivityRef.current = Date.now();

    // Set up interval to refresh every 10 minutes
    refreshIntervalRef.current = setInterval(performRefresh, REFRESH_INTERVAL);

    if (process.env.NODE_ENV === 'development') {
      console.log('[Auth] Token refresh timer started (every 10 minutes)');
    }
  }, []);

  /**
   * Initialize authentication on mount
   * Checks for existing session via /auth/me
   */
  const initializeAuth = useCallback(async () => {
    // Prevent multiple initializations
    if (initializeRef.current) return;
    initializeRef.current = true;

    try {
      // ✅ Pre-fetch CSRF token in background to ensure readiness for mutations
      prefetchCSRFToken().catch((err) => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Auth] CSRF prefetch failed:', err);
        }
      });

      const userData = await authApi.getMe(true);
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
  }, [setupTokenRefresh]);

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
    } catch (err) {
      const normalizedErr = normalizeError(err as any);
      setError(normalizedErr);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    []
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
   */
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Call logout endpoint
      await authApi.logout();

      // Clear state
      setUser(null);

      // ✅ Fix #2: Reset circuit breaker on logout
      clearCSRFToken();
      resetAuthState();

      // Stop token refresh
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }

      // ✅ Broadcast LOGOUT event to other tabs
      const authChannel = new BroadcastChannel('auth_channel');
      authChannel.postMessage({ type: 'LOGOUT' });
      authChannel.close();

    } catch (err) {
      const normalizedErr = normalizeError(err as any);
      setError(normalizedErr);
      throw err;
    } finally {
      setIsLoading(false);
    }
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

        // ✅ If auto-login is enabled, set user state
        if (response.autoLogin && response.user) {
          // Map response user to full User type
          const fullUser: User = {
            _id: response.user.id,
            name: response.user.name,
            email: response.user.email,
            role: response.user.role as any,
            companyId: response.user.companyId,
            teamRole: response.user.teamRole as any,
            isEmailVerified: true,
            isActive: true,
            kycStatus: {
              isComplete: false,
              lastUpdated: undefined,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          setUser(fullUser);

          // Broadcast login to other tabs via BroadcastChannel
          const authChannel = new BroadcastChannel('auth_channel');
          authChannel.postMessage({ type: 'LOGIN', user: fullUser });
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;

