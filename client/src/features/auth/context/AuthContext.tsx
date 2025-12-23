"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { authApi, AuthUser, LoginCredentials, RegisterData } from '@/src/core/api'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type { AuthUser, LoginCredentials }

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
    const [initAttempted, setInitAttempted] = useState(false)

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
        // Prevent multiple initialization attempts
        if (initAttempted) {
            return;
        }

        let mounted = true;

        const initAuth = async () => {
            setInitAttempted(true);

            // Skip auth check on public pages to avoid unnecessary API calls
            if (typeof window !== 'undefined') {
                const publicPaths = ['/', '/login', '/signup', '/forgot-password', '/reset-password'];
                const currentPath = window.location.pathname;

                // If on public page, immediately set user to null and stop loading
                if (publicPaths.includes(currentPath) || currentPath.startsWith('/verify-email')) {
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
    }, [fetchCurrentUser, initAttempted])

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
