/**
 * Auth API Service
 * 
 * Handles all authentication-related API calls to the backend.
 * Tokens are stored in httpOnly cookies (set by server).
 */

import { apiClient } from './client';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'seller' | 'staff' | 'user';
    companyId?: string;
    isEmailVerified?: boolean;
    isActive?: boolean;
}

export interface LoginCredentials {
    email: string;
    password: string;
    rememberMe?: boolean;
}

export interface LoginResponse {
    message: string;
    user: AuthUser;
}

export interface RegisterData {
    name: string;
    email: string;
    password: string;
    invitationToken?: string;
}

export interface RegisterResponse {
    message: string;
    companyId?: string;
}

export interface RefreshResponse {
    message: string;
}

export interface MeResponse {
    user: AuthUser;
}

// ═══════════════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Login user with email and password
 * Server sets httpOnly cookies for tokens
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials, {
        headers: {
            'X-CSRF-Token': 'frontend-request',
        },
    });
    return response.data;
}

/**
 * Register a new user
 */
export async function register(data: RegisterData): Promise<RegisterResponse> {
    const response = await apiClient.post<RegisterResponse>('/auth/register', data, {
        headers: {
            'X-CSRF-Token': 'frontend-request',
        },
    });
    return response.data;
}

/**
 * Logout user - server clears cookies
 */
export async function logout(): Promise<void> {
    await apiClient.post('/auth/logout');
}

/**
 * Refresh access token using refresh token cookie
 * Server sets new cookies automatically
 */
export async function refreshToken(): Promise<RefreshResponse> {
    const response = await apiClient.post<RefreshResponse>('/auth/refresh');
    return response.data;
}

/**
 * Get current authenticated user
 */
export async function getMe(): Promise<AuthUser> {
    const response = await apiClient.get('/auth/me');
    return response.data;
}

/**
 * Request password reset email
 */
export async function requestPasswordReset(email: string): Promise<{ message: string }> {
    const response = await apiClient.post('/auth/request-password-reset', { email }, {
        headers: {
            'X-CSRF-Token': 'frontend-request',
        },
    });
    return response.data;
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, password: string): Promise<{ message: string }> {
    const response = await apiClient.post('/auth/reset-password', { token, password }, {
        headers: {
            'X-CSRF-Token': 'frontend-request',
        },
    });
    return response.data;
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string): Promise<{ message: string }> {
    const response = await apiClient.post('/auth/verify-email', { token });
    return response.data;
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(email: string): Promise<{ message: string }> {
    const response = await apiClient.post('/auth/resend-verification', { email }, {
        headers: {
            'X-CSRF-Token': 'frontend-request',
        },
    });
    return response.data;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT AUTH API OBJECT
// ═══════════════════════════════════════════════════════════════════════════

export const authApi = {
    login,
    register,
    logout,
    refreshToken,
    getMe,
    requestPasswordReset,
    resetPassword,
    verifyEmail,
    resendVerificationEmail,
};

export default authApi;
