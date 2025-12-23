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
        const initAuth = async () => {
            try {
                // First try to refresh the token (uses httpOnly cookie)
                await authApi.refreshToken()

                // Then fetch current user
                const userData = await fetchCurrentUser()
                setUser(userData)
            } catch {
                // No valid session
                setUser(null)
            } finally {
                setIsLoading(false)
            }
        }

        initAuth()
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
