"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

// TODO: Replace with actual auth hooks when auth API is implemented
export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'seller' | 'staff';
    companyId?: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
    rememberMe?: boolean;
}

export interface SignupData {
    name: string;
    email: string;
    password: string;
}

export interface LoginResponse {
    accessToken: string;
    user: AuthUser;
}

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
                    // TODO: Implement token refresh when auth API is ready
                    // const response = await authService.refreshToken()
                    // if (response.accessToken) {
                    //     localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken)
                    // }
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
            // TODO: Implement actual login API call
            // const response: LoginResponse = await authService.login(credentials)
            // localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken)
            // setUser(response.user)

            // Placeholder for development
            console.warn('Login not implemented - using placeholder')
            return { success: false, error: 'Auth API not implemented yet' }
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
            // TODO: Implement actual register API call
            // const response = await authService.register(data)
            // return { success: true, message: response.message }

            // Placeholder for development
            console.warn('Register not implemented - using placeholder')
            return { success: false, error: 'Auth API not implemented yet' }
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
            // TODO: Implement actual logout API call
            // await authService.logout()
            console.warn('Logout not implemented - using placeholder')
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
