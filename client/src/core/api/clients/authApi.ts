/**
 * Authentication API Layer
 * Handles all auth-related API calls with correct endpoint and payload formats
 * Based on verified backend API contracts
 */

import { apiClient, ApiError } from '../http';
import type {
  User,
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  GetMeResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
  ResendVerificationRequest,
  ResendVerificationResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  ResetPasswordConfirmRequest,
  ResetPasswordConfirmResponse,
  RefreshTokenResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
} from '@/src/types/auth';

// ═══════════════════════════════════════════════════════════════════════════
// AUTH API SERVICE
// ═══════════════════════════════════════════════════════════════════════════

class AuthApiService {
  /**
   * Register a new user
   * POST /auth/register
   */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await apiClient.post<RegisterResponse>('/auth/register', {
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role || 'seller',
      ...(data.invitationToken && { invitationToken: data.invitationToken }),
    });

    return response.data;
  }

  /**
   * Login with email and password
   * POST /auth/login
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', {
      email: data.email,
      password: data.password,
      rememberMe: data.rememberMe ?? false,
    });

    return response.data;
  }

  /**
   * Get current authenticated user
   * GET /auth/me
   */
  async getMe(skipRefresh = false): Promise<User> {
    const config = skipRefresh ? { headers: { 'X-Skip-Refresh': 'true' } } : {};
    const response = await apiClient.get<GetMeResponse>('/auth/me', config);
    return response.data.data.user;
  }

  /**
   * Refresh access token using refresh token cookie
   * POST /auth/refresh
   * Returns user data to avoid race condition with getMe()
   */
  async refreshToken(): Promise<{ data: { user: User } }> {
    const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh');
    return response.data;
  }

  /**
   * Logout user and clear tokens
   * POST /auth/logout
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post<LogoutResponse>('/auth/logout');
    } catch (error) {
      // Even if logout fails on server, tokens are cleared on client
      console.warn('[Auth] Server logout failed, tokens will be cleared', error);
    }
  }

  /**
   * Verify email with token from registration email
   * POST /auth/verify-email
   */
  async verifyEmail(token: string): Promise<VerifyEmailResponse> {
    const response = await apiClient.post<VerifyEmailResponse>('/auth/verify-email', {
      token,
    });

    return response.data;
  }

  /**
   * Resend verification email to user
   * POST /auth/resend-verification
   */
  async resendVerification(email: string): Promise<ResendVerificationResponse> {
    const response = await apiClient.post<ResendVerificationResponse>(
      '/auth/resend-verification',
      {
        email,
      }
    );

    return response.data;
  }

  /**
   * Request password reset by email
   * POST /auth/reset-password
   */
  async resetPassword(email: string): Promise<ResetPasswordResponse> {
    const response = await apiClient.post<ResetPasswordResponse>('/auth/reset-password', {
      email,
    });

    return response.data;
  }

  /**
   * Confirm password reset with token and new password
   * POST /auth/reset-password/confirm
   */
  async resetPasswordConfirm(
    token: string,
    newPassword: string
  ): Promise<ResetPasswordConfirmResponse> {
    const response = await apiClient.post<ResetPasswordConfirmResponse>(
      '/auth/reset-password/confirm',
      {
        token,
        newPassword,
      }
    );

    return response.data;
  }

  /**
   * Change password (requires current password)
   * POST /auth/change-password
   */
  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<ChangePasswordResponse> {
    const response = await apiClient.post<ChangePasswordResponse>('/auth/change-password', {
      currentPassword,
      newPassword,
    });

    return response.data;
  }

  /**
   * Check password strength using backend validation
   * POST /auth/check-password-strength
   */
  async checkPasswordStrength(
    password: string,
    email?: string,
    name?: string
  ): Promise<{
    score: number;
    isStrong: boolean;
    feedback: {
      warning?: string;
      suggestions: string[];
    };
    requirements: {
      minLength: number;
      minScore: number;
      requireLowercase: boolean;
      requireUppercase: boolean;
      requireNumber: boolean;
      requireSpecial: boolean;
    };
  }> {
    const response = await apiClient.post('/auth/check-password-strength', {
      password,
      email,
      name,
    });

    return response.data.data;
  }

  /**
   * Change email address
   * POST /auth/change-email
   */
  async changeEmail(newEmail: string, password?: string): Promise<any> {
    const response = await apiClient.post('/auth/change-email', {
      newEmail,
      password, // Optional for OAuth users
    });
    return response.data;
  }

  /**
   * Request magic link for passwordless login
   * POST /auth/magic-link
   */
  async requestMagicLink(email: string): Promise<any> {
    const response = await apiClient.post('/auth/magic-link', { email });
    return response.data;
  }

  /**
   * Verify magic link token
   * GET /auth/magic-link/verify?token=xxx
   */
  async verifyMagicLink(token: string): Promise<any> {
    const response = await apiClient.get(`/auth/magic-link/verify?token=${token}`);
    return response.data;
  }

  /**
   * Request account recovery (unlock locked account)
   * POST /auth/recovery/request-unlock
   */
  async requestAccountRecovery(email: string): Promise<any> {
    const response = await apiClient.post('/auth/recovery/request-unlock', { email });
    return response.data;
  }

  /**
   * Verify account recovery token
   * POST /auth/recovery/verify-unlock
   */
  async verifyRecoveryToken(token: string): Promise<any> {
    const response = await apiClient.post('/auth/recovery/verify-unlock', { token });
    return response.data;
  }

  /**
   * Deactivate account
   * POST /auth/deactivate
   */
  async deactivateAccount(reason?: string, password?: string): Promise<any> {
    const response = await apiClient.post('/auth/deactivate', { reason, password });
    return response.data;
  }

  /**
   * Schedule account deletion (30-day grace period)
   * POST /auth/delete/schedule
   */
  async scheduleAccountDeletion(reason?: string, password?: string): Promise<any> {
    const response = await apiClient.post('/auth/delete/schedule', { reason, password });
    return response.data;
  }

  /**
   * Cancel scheduled account deletion
   * POST /auth/delete/cancel
   */
  async cancelAccountDeletion(): Promise<any> {
    const response = await apiClient.post('/auth/delete/cancel');
    return response.data;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

export const authApi = new AuthApiService();
