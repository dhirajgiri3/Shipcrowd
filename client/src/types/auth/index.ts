/**
 * Authentication Types
 * Aligned with backend User model and API contracts
 */

// ═══════════════════════════════════════════════════════════════════════════
// USER TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface User {
  _id: string;
  email: string;
  name: string;
  role: 'admin' | 'seller' | 'staff';
  companyId?: string;

  // Team fields
  teamRole?: 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
  teamStatus?: 'active' | 'invited' | 'suspended';

  // OAuth
  googleId?: string;
  oauthProvider?: 'email' | 'google';
  isEmailVerified: boolean;
  avatar?: string;

  // Profile (expanded to match backend)
  profile?: {
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    dateOfBirth?: string; // ISO string
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    bio?: string;
    website?: string;
    socialLinks?: {
      twitter?: string;
      linkedin?: string;
      github?: string;
      facebook?: string;
    };
    preferredLanguage?: string;
    preferredCurrency?: string;
    timezone?: string;
  };

  // KYC Status (required, not optional)
  kycStatus: {
    isComplete: boolean;
    lastUpdated?: string;
  };

  // Account Status
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH REQUEST/RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'seller' | 'staff';
  invitationToken?: string;
}

export interface RegisterResponse {
  success: true;
  message: string;
  data: Record<string, unknown>;
  timestamp?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: true;
  message: string;
  data: {
    user: User;
  };
  timestamp?: string;
}

export interface LogoutResponse {
  success: true;
  message: string;
}

export interface GetMeResponse {
  success: true;
  message: string;
  data: {
    user: User;
  };
}

export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyEmailResponse {
  success: true;
  message: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    companyId?: string;
    teamRole?: string;
  };
  autoLogin?: boolean;
  redirectUrl?: string;
}


export interface ResendVerificationRequest {
  email: string;
}

export interface ResendVerificationResponse {
  success: true;
  message: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ResetPasswordResponse {
  success: true;
  message: string;
}

export interface ResetPasswordConfirmRequest {
  token: string;
  newPassword: string;
}

export interface ResetPasswordConfirmResponse {
  success: true;
  message: string;
}

export interface RefreshTokenResponse {
  success: true;
  message: string;
  data: {
    user: User;
  };
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: true;
  message: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ApiErrorResponse {
  success: false;
  error?: {
    code: string;
    message: string;
    field?: string;
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
  message?: string;
  timestamp?: string;
}

export interface NormalizedError {
  code: string;
  message: string;
  field?: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH CONTEXT TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface AuthContextType {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: NormalizedError | null;

  // Auth Actions
  register: (data: RegisterRequest) => Promise<{ success: boolean; error?: NormalizedError }>;
  login: (data: LoginRequest) => Promise<{ success: boolean; user?: User; error?: NormalizedError }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;

  // Verification
  verifyEmail: (token: string) => Promise<{ success: boolean; data?: VerifyEmailResponse; error?: NormalizedError }>;
  resendVerification: (email: string) => Promise<{ success: boolean; error?: NormalizedError }>;

  // Password Management
  resetPassword: (email: string) => Promise<{ success: boolean; error?: NormalizedError }>;
  resetPasswordConfirm: (
    token: string,
    newPassword: string
  ) => Promise<{ success: boolean; error?: NormalizedError }>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ success: boolean; message?: string; error?: NormalizedError }>;

  // Account Settings
  changeEmail: (data: { newEmail: string; password?: string }) => Promise<{
    success: boolean;
    message?: string;
    error?: string
  }>;

  // Session Management
  sessions: Session[];
  loadSessions: () => Promise<void>;
  revokeSession: (sessionId: string) => Promise<{
    success: boolean;
    message?: string;
    error?: string
  }>;
  revokeAllSessions: () => Promise<{
    success: boolean;
    message?: string;
    revokedCount?: number;
    error?: string
  }>;

  // Company Management
  createCompany: (data: {
    name: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
    billingInfo?: {
      gstin?: string;
      pan?: string;
    };
  }) => Promise<{
    success: boolean;
    company?: any;
    error?: NormalizedError;
  }>;

  // Note: Password strength check moved to authApi.checkPasswordStrength()
  // Call directly from components instead of through context

  // Utilities
  clearError: () => void;
}

// Session type for active sessions management
export interface Session {
  _id: string;
  deviceInfo: {
    type: 'mobile' | 'tablet' | 'desktop';
    os?: string;
    browser?: string;
  };
  ip: string;
  location?: {
    city?: string;
    country?: string;
  };
  lastActive: string;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// PASSWORD VALIDATION TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface PasswordStrength {
  isValid: boolean;
  strength: 'weak' | 'fair' | 'good' | 'strong';
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// FORM TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface SignupFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

export interface ResetPasswordFormData {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
