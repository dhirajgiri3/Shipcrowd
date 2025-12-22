/**
 * Auth API Service
 * 
 * Handles all authentication-related API calls to the backend.
 */

import { apiClient, setAuthToken, removeAuthToken } from './client';

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
    accessToken: string;
    user: AuthUser;
    expiresIn: number;
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
    accessToken: string;
    expiresIn: number;
}

export interface MeResponse {
    user: AuthUser;
}

// ═══════════════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Login user with email and password
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials, {
        withCredentials: true, // Important for refresh token cookie
        headers: {
            'X-CSRF-Token': 'frontend-request', // CSRF token for protection
        },
    });

    // Store access token
    if (response.data.accessToken) {
        setAuthToken(response.data.accessToken);
    }

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
 * Logout user and clear tokens
 */
export async function logout(): Promise<void> {
    try {
        await apiClient.post('/auth/logout', {}, {
            withCredentials: true,
        });
    } finally {
        // Always clear local token, even if server request fails
        removeAuthToken();
    }
}

/**
 * Refresh access token using refresh token cookie
 */
export async function refreshToken(): Promise<RefreshResponse> {
    const response = await apiClient.post<RefreshResponse>('/auth/refresh', {}, {
        withCredentials: true, // Send refresh token cookie
    });

    // Store new access token
    if (response.data.accessToken) {
        setAuthToken(response.data.accessToken);
    }

    return response.data;
}

/**
 * Get current authenticated user
 */
export async function getMe(): Promise<AuthUser> {
    const response = await apiClient.get<MeResponse>('/auth/me', {
        withCredentials: true,
    });
    return response.data.user;
}

/**
 * Request password reset email
 */
export async function requestPasswordReset(email: string): Promise<{ message: string }> {
    const response = await apiClient.post('/auth/reset-password', { email }, {
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
    const response = await apiClient.post('/auth/reset-password/confirm', { token, password }, {
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
