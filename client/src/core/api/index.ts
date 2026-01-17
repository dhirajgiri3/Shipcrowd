/**
 * Core API Module - Barrel Export
 * 
 * Centralized export for all API-related functionality.
 * Use this for clean imports throughout the application.
 */

// API Client
export { apiClient, normalizeError, isApiEnabled } from './config/client';
export type { ApiError } from './config/client';

// Auth API
export { authApi } from './clients/authApi';
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
export { companyApi } from './clients/companyApi';
// export type { Company, CompanyAddress, CompanyBillingInfo, CreateCompanyData } from './clients/companyApi';

// KYC API
export { kycApi } from './clients/kycApi';
// export type { KYCData, KYCDocument, SubmitKYCRequest, VerifyPANRequest, VerifyBankAccountRequest, VerifyGSTINRequest } from './clients/kycApi';

// Other APIs
export { consentApi } from './clients/consentApi';
export { orderApi } from './clients/orderApi';
export { recoveryApi } from './clients/recoveryApi';
export { sessionApi } from './clients/sessionApi';
export { trackingApi } from './clients/trackingApi';

// Queries & Utils
export { optimisticListUpdate } from './queries/optimisticUpdates';
export { requestDeduplicator } from './lib/requestDeduplication';

// Error Handling (Legacy - should move to lib/utils/error-handler)
// export { handleApiError, showSuccessToast, showInfoToast } from '@/src/lib/error-handler';

// React Query Hooks (Already in separate folder)
export * from './hooks';

// OpenAPI Types
// export type { components, paths } from './types/api';
