"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { authService, AuthUser, LoginCredentials, SignupData, LoginResponse } from '@/src/lib/api/services/auth.service'

export interface AuthContextType {
    user: AuthUser | null
    isLoading: boolean
    isAuthenticated: boolean
    error: string | null
    login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>
    register: (data: SignupData) => Promise<{ success: boolean; message?: string; error?: string }>
    logout: () => Promise<void>
    clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const ACCESS_TOKEN_KEY = 'shipcrowd_access_token'

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const isAuthenticated = !!user

    // Initialize auth state from stored token
    useEffect(() => {
        const initAuth = async () => {
            try {
                const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                if (token) {
                    // Try to refresh the token
                    const response = await authService.refreshToken()
                    if (response.accessToken) {
                        localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken)
                        // Note: We don't get user info from refresh, so we'd need a /me endpoint
                        // For now, we'll rely on the login flow
                    }
                }
            } catch (err) {
                // Token is invalid, clear it
                localStorage.removeItem(ACCESS_TOKEN_KEY)
            } finally {
                setIsLoading(false)
            }
        }

        initAuth()
    }, [])

    const login = useCallback(async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
        setIsLoading(true)
        setError(null)

        try {
            const response: LoginResponse = await authService.login(credentials)

            // Store the access token
            localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken)

            // Set user state
            setUser(response.user)

            return { success: true }
        } catch (err: any) {
            const errorMessage = err.message || 'Login failed. Please try again.'
            setError(errorMessage)
            return { success: false, error: errorMessage }
        } finally {
            setIsLoading(false)
        }
    }, [])

    const register = useCallback(async (data: SignupData): Promise<{ success: boolean; message?: string; error?: string }> => {
        setIsLoading(true)
        setError(null)

        try {
            const response = await authService.register(data)
            return { success: true, message: response.message }
        } catch (err: any) {
            const errorMessage = err.message || 'Registration failed. Please try again.'
            setError(errorMessage)
            return { success: false, error: errorMessage }
        } finally {
            setIsLoading(false)
        }
    }, [])

    const logout = useCallback(async () => {
        setIsLoading(true)
        try {
            await authService.logout()
        } catch (err) {
            // Even if logout fails on server, clear local state
            console.error('Logout error:', err)
        } finally {
            localStorage.removeItem(ACCESS_TOKEN_KEY)
            setUser(null)
            setIsLoading(false)
        }
    }, [])

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
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
