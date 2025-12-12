import { apiClient } from '../client';

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

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'seller' | 'staff';
    companyId?: string;
}

export interface LoginResponse {
    accessToken: string;
    user: AuthUser;
}

export interface MessageResponse {
    message: string;
}

export const authService = {
    /**
     * Login user
     */
    async login(credentials: LoginCredentials): Promise<LoginResponse> {
        return apiClient.post('/v1/auth/login', credentials);
    },

    /**
     * Register new user
     */
    async register(data: SignupData): Promise<MessageResponse> {
        return apiClient.post('/v1/auth/register', data);
    },

    /**
     * Logout user
     */
    async logout(): Promise<MessageResponse> {
        return apiClient.post('/v1/auth/logout');
    },

    /**
     * Refresh access token
     */
    async refreshToken(): Promise<{ accessToken: string }> {
        return apiClient.post('/v1/auth/refresh');
    },

    /**
     * Request password reset
     */
    async requestPasswordReset(email: string): Promise<MessageResponse> {
        return apiClient.post('/v1/auth/reset-password', { email });
    },

    /**
     * Reset password with token
     */
    async resetPassword(token: string, password: string): Promise<MessageResponse> {
        return apiClient.post('/v1/auth/reset-password/confirm', { token, password });
    },

    /**
     * Verify email with token
     */
    async verifyEmail(token: string): Promise<MessageResponse> {
        return apiClient.post('/v1/auth/verify-email', { token });
    },

    /**
     * Resend verification email
     */
    async resendVerificationEmail(email: string): Promise<MessageResponse> {
        return apiClient.post('/v1/auth/resend-verification', { email });
    },

    /**
     * Check password strength
     */
    async checkPasswordStrength(password: string, email?: string, name?: string): Promise<{
        score: number;
        feedback: string[];
        isStrong: boolean;
    }> {
        return apiClient.post('/v1/auth/check-password-strength', { password, email, name });
    },
};
