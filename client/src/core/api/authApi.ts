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

    // Team fields
    teamRole?: 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
    teamStatus?: 'active' | 'invited' | 'suspended';
    permissions?: string[];

    // KYC status - matches backend response
    kycStatus?: {
        status: 'not_started' | 'pending' | 'verified' | 'rejected';
        submittedAt?: string;
        verifiedAt?: string;
        rejectedAt?: string;
        rejectionReason?: string;
        adminNotes?: string;
    };
    profileCompletion?: {
        status: number;
        requiredFieldsCompleted: boolean;
        lastUpdated: string;
    };
    profile?: {
        phone?: string;
        city?: string;
        state?: string;
        country?: string;
    };

    // Security info
    lastLogin?: {
        timestamp: string;
        ip: string;
        userAgent: string;
    };

    // Legacy/Client-computed fields
    companyStatus?: 'active' | 'inactive' | 'suspended';
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

export interface PasswordStrengthResponse {
    score: number; // 0-4
    strength: 'weak' | 'fair' | 'good' | 'strong';
    feedback: {
        warning?: string;
        suggestions: string[];
    };
    crackTime: string;
}

export interface ChangePasswordData {
    currentPassword: string;
    newPassword: string;
}

export interface ChangeEmailData {
    newEmail: string;
    password: string;
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
    const response = await apiClient.get<MeResponse>('/auth/me');
    // Backend returns { user: AuthUser }, extract the user object
    return response.data.user || response.data;
}

/**
 * Request password reset email
 * Backend endpoint: POST /auth/reset-password
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
 * Backend endpoint: POST /auth/reset-password/confirm
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
 * Change password (while logged in)
 * Requires current password for verification
 */
export async function changePassword(data: ChangePasswordData): Promise<{ message: string }> {
    const response = await apiClient.post('/auth/change-password', data, {
        headers: {
            'X-CSRF-Token': 'frontend-request',
        },
    });
    return response.data;
}

/**
 * Change email address
 * Sends verification email to new address
 */
export async function changeEmail(data: ChangeEmailData): Promise<{ message: string }> {
    const response = await apiClient.post('/auth/change-email', data, {
        headers: {
            'X-CSRF-Token': 'frontend-request',
        },
    });
    return response.data;
}

/**
 * Verify email change with token
 */
export async function verifyEmailChange(token: string): Promise<{ message: string }> {
    const response = await apiClient.post('/auth/verify-email-change', { token });
    return response.data;
}

/**
 * Set password for OAuth users
 * Allows OAuth users to add password authentication
 */
export async function setPassword(password: string): Promise<{ message: string }> {
    const response = await apiClient.post('/auth/set-password', { password }, {
        headers: {
            'X-CSRF-Token': 'frontend-request',
        },
    });
    return response.data;
}

/**
 * Check password strength
 * Returns score and feedback for password validation
 */
export async function checkPasswordStrength(password: string): Promise<PasswordStrengthResponse> {
    const response = await apiClient.post<PasswordStrengthResponse>('/auth/check-password-strength', { password });
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
    changePassword,
    changeEmail,
    verifyEmailChange,
    setPassword,
    checkPasswordStrength,
    verifyEmail,
    resendVerificationEmail,
};

export default authApi;
