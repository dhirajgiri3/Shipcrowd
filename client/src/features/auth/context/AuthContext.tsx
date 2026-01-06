'use client';

import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import type { User, AuthContextType, RegisterRequest, LoginRequest, NormalizedError } from '@/src/types/auth';
import { authApi } from '@/src/core/api/auth.api';
import { sessionApi, type Session } from '@/src/core/api/session.api';
import { clearCSRFToken, prefetchCSRFToken } from '@/src/core/api/client';
import { normalizeError } from '@/src/core/api/client';
import { toast } from 'sonner';
import axios from 'axios';

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

    authChannel.onmessage = (event) => {
      if (event.data.type === 'LOGOUT') {
        // Received LOGOUT from another tab
        // Only act if currently logged in to avoid loops
        setUser((currentUser) => {
          if (currentUser) {
            // Clear local state without calling API (since other tab did it)
            clearCSRFToken();
            if (refreshIntervalRef.current) {
              clearInterval(refreshIntervalRef.current);
              refreshIntervalRef.current = null;
            }
            if (process.env.NODE_ENV === 'development') {
              console.log('[Auth] Synced logout from another tab');
            }
            return null;
          }
          return currentUser;
        });
      } else if (event.data.type === 'LOGIN') {
        // Received LOGIN from another tab
        // If currently logged out, fetch user to sync state
        setUser((currentUser) => {
          if (!currentUser) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[Auth] Synced login from another tab');
            }
            // Trigger re-fetch
            authApi.getMe().then(userData => {
              setUser(userData);
              setupTokenRefresh();
              prefetchCSRFToken().catch(console.warn);
            }).catch(console.error);
          }
          return currentUser;
        });
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
  }, []);

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

    // Reset refresh timestamp
    lastRefreshRef.current = Date.now();

    // Check every minute
    refreshIntervalRef.current = setInterval(async () => {
      const now = Date.now();
      const timeSinceRefresh = now - lastRefreshRef.current;
      const timeSinceActivity = now - lastActivityRef.current;

      // CONFIG: Refresh after 14 mins
      const REFRESH_THRESHOLD = 14 * 60 * 1000;
      // CONFIG: Stop refreshing if inactive for 20 mins
      const INACTIVITY_TIMEOUT = 20 * 60 * 1000;

      // Only attempt refresh if time threshold met
      if (timeSinceRefresh >= REFRESH_THRESHOLD) {
        // ✅ Only refresh if user has been active recently
        if (timeSinceActivity < INACTIVITY_TIMEOUT) {
          try {
            if (process.env.NODE_ENV === 'development') {
              console.log('[Auth] Refreshing token (Active Session)');
            }
            await authApi.refreshToken();
            const userData = await authApi.getMe();
            setUser(userData);
            // Update last refresh time on success
            lastRefreshRef.current = Date.now();
          } catch (err) {
            // Token refresh failed - session expired
            console.error('[Auth] Refresh failed', err);
            setUser(null);
            if (refreshIntervalRef.current) {
              clearInterval(refreshIntervalRef.current);
              refreshIntervalRef.current = null;
            }
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('[Auth] Skipping refresh - User inactive');
          }
          // Do nothing, let token expire naturally. 
          // Next user action will trigger 401 -> retry -> refresh (if refresh token valid)
        }
      }
    }, 60 * 1000); // Check every minute
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

      const userData = await authApi.getMe();
      setUser(userData);
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

        const response = await authApi.login(data);
        const userData = response.data.user;

        // ✅ Security: Rotate CSRF token on login to prevent session fixation
        clearCSRFToken();
        prefetchCSRFToken().catch(console.warn);

        setUser(userData);
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

      // Clear CSRF token
      clearCSRFToken();

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

        await authApi.verifyEmail(token);

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
    async (token: string, password: string) => {
      try {
        setIsLoading(true);
        setError(null);

        await authApi.resetPasswordConfirm(token, password);

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
   * Change email - Stub implementation
   * TODO: Backend endpoint not yet available
   */
  const changeEmail = useCallback(async (data: { newEmail: string; password: string }) => {
    try {
      setIsLoading(true);
      setError(null);

      // TODO: Implement when backend endpoint is ready
      // await authApi.changeEmail(data);

      return {
        success: false,
        error: 'Email change endpoint is not yet available on the backend. Please contact support.'
      };
    } catch (err) {
      const normalizedErr = normalizeError(err as any);
      setError(normalizedErr);
      return { success: false, error: normalizedErr.message };
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
      toast.error('Failed to load sessions. Please try again.');
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

      toast.success('Session revoked successfully');
      return { success: true };
    } catch (err) {
      const normalizedErr = normalizeError(err as any);
      setError(normalizedErr);
      toast.error('Failed to revoke session. Please try again.');
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

      toast.success(`${result.revoked} session(s) revoked successfully`);
      return { success: true, revokedCount: result.revoked };
    } catch (err) {
      const normalizedErr = normalizeError(err as any);
      setError(normalizedErr);
      toast.error('Failed to revoke sessions. Please try again.');
      return { success: false, error: normalizedErr.message };
    } finally {
      setIsLoading(false);
    }
  }, [loadSessions]);

  /**
   * Check password strength - Uses local validation
   */
  const checkPasswordStrength = useCallback(async (password: string) => {
    // Local password strength calculation
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    const strengthMap: Record<number, string> = {
      0: 'weak', 1: 'weak', 2: 'fair', 3: 'good', 4: 'strong', 5: 'strong'
    };

    const suggestions: string[] = [];
    if (password.length < 12) suggestions.push('Use at least 12 characters');
    if (!/[A-Z]/.test(password)) suggestions.push('Add uppercase letters');
    if (!/[a-z]/.test(password)) suggestions.push('Add lowercase letters');
    if (!/\d/.test(password)) suggestions.push('Add numbers');
    if (!/[^a-zA-Z0-9]/.test(password)) suggestions.push('Add special characters');

    return {
      score,
      strength: strengthMap[score] || 'weak',
      feedback: {
        warning: score < 3 ? 'Password is too weak' : undefined,
        suggestions,
      },
    };
  }, []);

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
    sessions,
    loadSessions,
    revokeSession,
    revokeAllSessions,
    checkPasswordStrength,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;

