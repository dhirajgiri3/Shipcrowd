"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { authApi, AuthUser, LoginCredentials, RegisterData, ChangePasswordData, ChangeEmailData, PasswordStrengthResponse } from '@/src/core/api'
import { sessionApi, Session } from '@/src/core/api/sessionApi'
import { clearCSRFToken } from '@/src/core/api/client'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type { AuthUser, LoginCredentials, Session }

export interface SignupData {
    name: string;
    email: string;
    password: string;
}

export interface AuthContextType {
    user: AuthUser | null
    isLoading: boolean
    isAuthenticated: boolean
    error: string | null
    login: (credentials: LoginCredentials) => Promise<{ success: boolean; user?: AuthUser; error?: string }>
    register: (data: SignupData) => Promise<{ success: boolean; message?: string; error?: string }>
    logout: () => Promise<void>
    clearError: () => void
    refreshUser: () => Promise<void>

    // Password management
    changePassword: (data: ChangePasswordData) => Promise<{ success: boolean; message?: string; error?: string }>
    checkPasswordStrength: (password: string) => Promise<PasswordStrengthResponse | null>

    // Email management
    changeEmail: (data: ChangeEmailData) => Promise<{ success: boolean; message?: string; error?: string }>

    // Session management
    sessions: Session[]
    loadSessions: () => Promise<void>
    revokeSession: (sessionId: string) => Promise<{ success: boolean; message?: string; error?: string }>
    revokeAllSessions: () => Promise<{ success: boolean; message?: string; revokedCount?: number; error?: string }>
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [sessions, setSessions] = useState<Session[]>([])

    const isAuthenticated = !!user

    /**
     * Fetch current user from the API
     */
    const fetchCurrentUser = useCallback(async (): Promise<AuthUser | null> => {
        try {
            const userData = await authApi.getMe()
            return userData
        } catch {
            return null
        }
    }, [])

    /**
     * Refresh user data
     */
    const refreshUser = useCallback(async () => {
        const userData = await fetchCurrentUser()
        setUser(userData)
    }, [fetchCurrentUser])

    /**
     * Initialize auth state on mount
     * Try to restore session using refresh token cookie
     */
    useEffect(() => {
        let mounted = true;

        const initAuth = async () => {
            // Skip auth check on auth pages to avoid unnecessary API calls
            // Note: Track page still initializes auth context (for optional login state)
            if (typeof window !== 'undefined') {
                const currentPath = window.location.pathname;

                // Use centralized route config to determine if we should skip auth init
                const { shouldSkipAuthInit } = await import('@/src/config/routes');

                // If on auth/verification page, immediately set user to null and stop loading
                if (shouldSkipAuthInit(currentPath)) {
                    if (mounted) {
                        setUser(null);
                        setIsLoading(false);
                    }
                    return; // Skip auth check entirely
                }
            }

            // Only run auth check for protected/authenticated pages
            try {
                // First, try to get current user directly (validates accessToken cookie)
                // This is cheaper than refresh and works if session is still valid
                const userData = await fetchCurrentUser()
                if (mounted) {
                    setUser(userData)
                }
            } catch (err: any) {
                if (!mounted) return;

                // If getMe fails, check if it's a 401 (could be expired access token)
                if (err?.code === 'HTTP_401') {
                    try {
                        // Try to refresh using refreshToken cookie
                        await authApi.refreshToken()

                        // If refresh succeeds, fetch user again
                        const userData = await fetchCurrentUser()
                        if (mounted) {
                            setUser(userData)
                            if (process.env.NODE_ENV === 'development') {
                                console.log('[Auth] Session restored via token refresh')
                            }
                        }
                    } catch (refreshErr: any) {
                        // Refresh failed - no valid session exists
                        // This is normal for logged-out users
                        if (mounted) {
                            setUser(null)

                            // Only log non-401 errors (network issues, server errors, etc.)
                            if (refreshErr?.code !== 'HTTP_401' && process.env.NODE_ENV === 'development') {
                                console.warn('[Auth] Session refresh failed:', refreshErr.message)
                            }
                        }
                    }
                } else {
                    // Non-401 error (network issue, server error, etc.)
                    if (mounted) {
                        setUser(null)
                        if (process.env.NODE_ENV === 'development') {
                            console.warn('[Auth] Session initialization failed:', err.message)
                        }
                    }
                }
            } finally {
                if (mounted) {
                    setIsLoading(false)
                }
            }
        }

        initAuth()

        return () => {
            mounted = false;
        }
    }, [fetchCurrentUser])

    /**
     * Login with email and password
     */
    const login = useCallback(async (credentials: LoginCredentials): Promise<{ success: boolean; user?: AuthUser; error?: string }> => {
        setIsLoading(true)
        setError(null)

        try {
            const response = await authApi.login(credentials)

            // Set user from login response
            setUser(response.user)

            return { success: true, user: response.user }
        } catch (err: any) {
            const errorMessage = err.message || 'Login failed. Please check your credentials.'
            setError(errorMessage)
            return { success: false, error: errorMessage }
        } finally {
            setIsLoading(false)
        }
    }, [])

    /**
     * Register a new user
     */
    const register = useCallback(async (data: SignupData): Promise<{ success: boolean; message?: string; error?: string }> => {
        setIsLoading(true)
        setError(null)

        try {
            const response = await authApi.register(data as RegisterData)
            return {
                success: true,
                message: response.message || 'Registration successful! Please check your email to verify your account.'
            }
        } catch (err: any) {
            const errorMessage = err.message || 'Registration failed. Please try again.'
            setError(errorMessage)
            return { success: false, error: errorMessage }
        } finally {
            setIsLoading(false)
        }
    }, [])

    /**
     * Logout user
     */
    const logout = useCallback(async () => {
        setIsLoading(true)
        try {
            await authApi.logout()
        } catch (err) {
            // Even if server logout fails, clear local state
            console.error('Logout error:', err)
        } finally {
            setUser(null)
            setIsLoading(false)
        }
    }, [])

    /**
     * Clear error state
     */
    const clearError = useCallback(() => {
        setError(null)
    }, [])

    /**
     * Change password (requires current password)
     */
    const changePassword = useCallback(async (data: ChangePasswordData): Promise<{ success: boolean; message?: string; error?: string }> => {
        setIsLoading(true)
        setError(null)

        try {
            const response = await authApi.changePassword(data)
            // Refresh user data after password change
            await refreshUser()
            return { success: true, message: response.message || 'Password changed successfully' }
        } catch (err: any) {
            const errorMessage = err.message || 'Failed to change password'
            setError(errorMessage)
            return { success: false, error: errorMessage }
        } finally {
            setIsLoading(false)
        }
    }, [refreshUser])

    /**
     * Check password strength
     */
    const checkPasswordStrength = useCallback(async (password: string): Promise<PasswordStrengthResponse | null> => {
        try {
            return await authApi.checkPasswordStrength(password)
        } catch (err: any) {
            console.error('[Auth] Password strength check failed:', err)
            return null
        }
    }, [])

    /**
     * Change email address
     */
    const changeEmail = useCallback(async (data: ChangeEmailData): Promise<{ success: boolean; message?: string; error?: string }> => {
        setIsLoading(true)
        setError(null)

        try {
            const response = await authApi.changeEmail(data)
            // Refresh user data to show pending email change
            await refreshUser()
            return { success: true, message: response.message || 'Verification email sent to new address' }
        } catch (err: any) {
            const errorMessage = err.message || 'Failed to change email'
            setError(errorMessage)
            return { success: false, error: errorMessage }
        } finally {
            setIsLoading(false)
        }
    }, [refreshUser])

    /**
     * Load all active sessions
     */
    const loadSessions = useCallback(async () => {
        try {
            const response = await sessionApi.getSessions()
            setSessions(response.sessions || [])
        } catch (err: any) {
            console.error('[Auth] Failed to load sessions:', err)
            setSessions([])
        }
    }, [])

    /**
     * Revoke a specific session
     */
    const revokeSession = useCallback(async (sessionId: string): Promise<{ success: boolean; message?: string; error?: string }> => {
        try {
            const response = await sessionApi.revokeSession(sessionId)
            // Reload sessions to reflect the change
            await loadSessions()
            return { success: true, message: response.message || 'Session revoked successfully' }
        } catch (err: any) {
            const errorMessage = err.message || 'Failed to revoke session'
            return { success: false, error: errorMessage }
        }
    }, [loadSessions])

    /**
     * Revoke all sessions except current
     */
    const revokeAllSessions = useCallback(async (): Promise<{ success: boolean; message?: string; revokedCount?: number; error?: string }> => {
        try {
            const response = await sessionApi.revokeAllSessions()
            // Reload sessions to reflect the change
            await loadSessions()
            return {
                success: true,
                message: response.message || 'All other sessions revoked',
                revokedCount: response.revokedCount
            }
        } catch (err: any) {
            const errorMessage = err.message || 'Failed to revoke sessions'
            return { success: false, error: errorMessage }
        }
    }, [loadSessions])

    /**
     * Automatic token refresh every 14 minutes
     * Keeps access token fresh before expiry (15 min)
     */
    useEffect(() => {
        if (!isAuthenticated) return

        const interval = setInterval(async () => {
            try {
                await authApi.refreshToken()
                if (process.env.NODE_ENV === 'development') {
                    console.log('[Auth] Token refreshed automatically')
                }
            } catch (error: any) {
                // If refresh fails, user will be logged out on next API call
                if (process.env.NODE_ENV === 'development') {
                    console.error('[Auth] Auto-refresh failed:', error.message)
                }
            }
        }, 14 * 60 * 1000) // 14 minutes

        return () => clearInterval(interval)
    }, [isAuthenticated])

    /**
     * Clear CSRF token on logout
     */
    useEffect(() => {
        if (!isAuthenticated) {
            clearCSRFToken()
        }
    }, [isAuthenticated])

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated,
                error,
                login,
                register,
                logout,
                clearError,
                refreshUser,
                changePassword,
                checkPasswordStrength,
                changeEmail,
                sessions,
                loadSessions,
                revokeSession,
                revokeAllSessions,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
