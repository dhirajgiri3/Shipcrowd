/**
 * Core API Module - Barrel Export
 * 
 * Centralized export for all API-related functionality.
 * Use this for clean imports throughout the application.
 */

// API Client
export { apiClient, normalizeError, isApiEnabled } from './client';
export type { ApiError } from './client';

// Auth API
export { authApi } from './authApi';
// export type {
//     AuthUser,
//     LoginCredentials,
//     LoginResponse,
//     RegisterData,
//     RegisterResponse,
//     ChangePasswordData,
//     ChangeEmailData,
//     PasswordStrengthResponse,
// } from './authApi';

// Company API
// export { companyApi } from './companyApi';
// export type { Company, CompanyAddress, CompanyBillingInfo, CreateCompanyData } from './companyApi';

// KYC API
// export { kycApi } from './kycApi';
// export type { KYCData, KYCDocument, SubmitKYCRequest, VerifyPANRequest, VerifyBankAccountRequest, VerifyGSTINRequest } from './kycApi';

// Error Handling
// export { handleApiError, showSuccessToast, showInfoToast } from '@/src/lib/error-handler';

// React Query Hooks
export * from './hooks';

// OpenAPI Types
// export type { components, paths } from './types/api';
