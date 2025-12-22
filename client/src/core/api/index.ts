/**
 * Core API Module - Barrel Export
 * 
 * Centralized export for all API-related functionality.
 * Use this for clean imports throughout the application.
 */

// API Client
export { apiClient, setAuthToken, removeAuthToken, normalizeError, isApiEnabled } from './client';
export type { ApiError } from './client';

// Error Handling
export { handleApiError, showSuccessToast, showInfoToast } from './errors/error-handler';

// React Query Hooks
export * from './hooks';

// OpenAPI Types
export type { components, paths } from './types/api';
