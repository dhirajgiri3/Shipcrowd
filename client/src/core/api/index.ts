/**
 * Core API Module - Barrel Export
 * 
 * Centralized export for all API-related functionality.
 * Use this for clean imports throughout the application.
 */

// API Client
export * from './http';

// API Clients (endpoints)
export { authApi } from './clients/authApi';
export { companyApi } from './clients/companyApi';
export type { Company, CompanyAddress, CompanyBillingInfo, CreateCompanyData } from './clients/companyApi';
export { kycApi } from './clients/kycApi';
export { consentApi } from './clients/consentApi';
export { orderApi } from './clients/orderApi';
export { recoveryApi } from './clients/recoveryApi';
export { sessionApi } from './clients/sessionApi';
export { trackingApi } from './clients/trackingApi';

// React Query Configuration
export * from './config';

// Utilities
export * from './lib';

// React Query Hooks
export * from './hooks';

