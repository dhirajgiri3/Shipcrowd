/**
 * Authentication API Layer
 * Handles all auth-related API calls with correct endpoint and payload formats
 * Based on verified backend API contracts
 */

import { apiClient, ApiError } from './client';
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
  async getMe(): Promise<User> {
    const response = await apiClient.get<GetMeResponse>('/auth/me');
    return response.data.data.user;
  }

  /**
   * Refresh access token using refresh token cookie
   * POST /auth/refresh
   */
  async refreshToken(): Promise<void> {
    await apiClient.post<RefreshTokenResponse>('/auth/refresh');
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
    password: string
  ): Promise<ResetPasswordConfirmResponse> {
    const response = await apiClient.post<ResetPasswordConfirmResponse>(
      '/auth/reset-password/confirm',
      {
        token,
        password,
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
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

export const authApi = new AuthApiService();
