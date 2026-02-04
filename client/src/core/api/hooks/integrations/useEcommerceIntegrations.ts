/**
 * E-Commerce Integrations API Hooks
 * 
 * React Query hooks for marketplace integrations, OAuth flows,
 * field mapping, and order synchronization.
 * Backend: GET/POST /api/v1/integrations/*
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/src/core/api/http';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

// ==================== Import Types ====================
import type {
    EcommerceIntegration,
    IntegrationListFilters,
    CreateIntegrationPayload,
    UpdateIntegrationPayload,
    TestConnectionPayload,
    TestConnectionResponse,
    TriggerSyncPayload,
    SyncLog,
    OAuthInitiateResponse,
    OAuthCallbackPayload,
    OAuthCompleteResponse,
    IntegrationType,
} from '@/src/types/api/integrations';

// ==================== Query Hooks ====================

/**
 * Get list of e-commerce integrations
 */
export const useIntegrations = (
    filters?: IntegrationListFilters,
    options?: Omit<UseQueryOptions<EcommerceIntegration[]>, 'queryKey' | 'queryFn'>
) => {
    return useQuery<EcommerceIntegration[]>({
        queryKey: queryKeys.ecommerce.integrationsList(filters),
        queryFn: async () => {
            const response = await apiClient.get('/integrations/shopify/stores', { params: filters });
            return response.data.data;
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Get single integration by ID
 */
export const useIntegration = (
    integrationId: string,
    options?: Omit<UseQueryOptions<EcommerceIntegration>, 'queryKey' | 'queryFn'>
) => {
    // Prevent query if integrationId is "new" or invalid
    const isValidId = Boolean(integrationId && integrationId !== 'new' && integrationId.length === 24);

    return useQuery<EcommerceIntegration>({
        queryKey: queryKeys.ecommerce.integration(integrationId),
        queryFn: async () => {
            const response = await apiClient.get(`/integrations/shopify/stores/${integrationId}`);
            return response.data.data;
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
        enabled: isValidId && (options?.enabled !== false), // Combine our validation with user options
    });
};

/**
 * Get sync logs for an integration
 */
export const useSyncLogs = (
    integrationId: string,
    options?: Omit<UseQueryOptions<SyncLog[]>, 'queryKey' | 'queryFn'>
) => {
    // Prevent query if integrationId is "new" or invalid
    const isValidId = Boolean(integrationId && integrationId !== 'new' && integrationId.length === 24);

    return useQuery<SyncLog[]>({
        queryKey: queryKeys.ecommerce.syncLogs(integrationId),
        queryFn: async () => {
            const response = await apiClient.get(`/integrations/shopify/stores/${integrationId}/sync/logs`);
            return response.data.data;
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
        enabled: isValidId && (options?.enabled !== false), // Combine our validation with user options
    });
};

// ==================== Mutation Hooks ====================

/**
 * Create a new e-commerce integration
 */
export const useCreateIntegration = (options?: UseMutationOptions<EcommerceIntegration, ApiError, CreateIntegrationPayload>) => {
    const queryClient = useQueryClient();

    return useMutation<EcommerceIntegration, ApiError, CreateIntegrationPayload>({
        mutationFn: async (payload) => {
            const response = await apiClient.post('/integrations', payload);
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.ecommerce.integrations() });
            showSuccessToast('Integration connected successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Update integration settings or field mapping
 */
export const useUpdateIntegration = (options?: UseMutationOptions<EcommerceIntegration, ApiError, UpdateIntegrationPayload>) => {
    const queryClient = useQueryClient();

    return useMutation<EcommerceIntegration, ApiError, UpdateIntegrationPayload>({
        mutationFn: async ({ integrationId, ...payload }) => {
            const response = await apiClient.patch(`/integrations/shopify/stores/${integrationId}/settings`, payload);
            return response.data.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.ecommerce.integration(data.integrationId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.ecommerce.integrations() });
            showSuccessToast('Integration updated successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Delete/disconnect an integration
 */
export const useDeleteIntegration = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, string>({
        mutationFn: async (integrationId) => {
            await apiClient.delete(`/integrations/shopify/stores/${integrationId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.ecommerce.integrations() });
            showSuccessToast('Integration disconnected');
        },
        onError: (error) => {
            handleApiError(error, 'Failed to Disconnect Integration');
        },
    });
};

/**
 * Test connection credentials before creating integration
 * Enhanced with retry logic, timeout handling, and detailed error reporting
 */
export const useTestConnection = () => {
    const [retryCount, setRetryCount] = useState(0);

    return useMutation<TestConnectionResponse, Error, TestConnectionPayload>({
        mutationFn: async (payload) => {
            const { wrapApiCall } = await import('./apiUtils');
            const { parseIntegrationError, formatErrorMessage } = await import('./integrationErrors');

            return wrapApiCall(
                async () => {
                    const response = await apiClient.post('/integrations/test-connection', payload);
                    return response.data.data;
                },
                {
                    timeout: {
                        timeoutMs: 30000, // 30 second timeout
                        timeoutMessage: 'Connection test timed out. Please check your network and try again.',
                    },
                    retry: {
                        maxRetries: 3,
                        initialDelay: 1000,
                        maxDelay: 5000,
                        backoffMultiplier: 2,
                    },
                    onRetry: (attempt, error) => {
                        setRetryCount(attempt + 1);
                        console.log(`Retry attempt ${attempt + 1}/3:`, error.message);
                    },
                }
            );
        },
        onSuccess: (data) => {
            setRetryCount(0);
            if (data.success) {
                showSuccessToast(`Connection successful! Found store: ${data.storeName}`);
            }
        },
        onError: (error: any) => {
            const { parseIntegrationError } = require('./integrationErrors');
            const parsedError = parseIntegrationError(error, retryCount);

            // Show detailed error with suggestion
            const errorMessage = parsedError.suggestion
                ? `${parsedError.message}. ${parsedError.suggestion}`
                : parsedError.message;

            handleApiError(
                { ...error, message: errorMessage },
                'Connection Test Failed'
            );

            setRetryCount(0);
        },
    });
};

/**
 * Trigger manual sync for an integration
 */
export const useTriggerSync = () => {
    const queryClient = useQueryClient();

    return useMutation<SyncLog, Error, TriggerSyncPayload>({
        mutationFn: async (payload) => {
            const response = await apiClient.post(`/integrations/shopify/stores/${payload.integrationId}/sync/orders`, payload);
            return response.data.data;
        },
        onSuccess: (_, { integrationId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.ecommerce.integration(integrationId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.ecommerce.syncLogs(integrationId) });
            showSuccessToast('Sync started successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Failed to Start Sync');
        },
    });
};

/**
 * Reconnect/refresh integration credentials
 */
export const useReconnectIntegration = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, { integrationId: string; credentials: any }>({
        mutationFn: async ({ integrationId, credentials }) => {
            await apiClient.post(`/integrations/${integrationId}/reconnect`, { credentials });
        },
        onSuccess: (_, { integrationId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.ecommerce.integration(integrationId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.ecommerce.integrations() });
            showSuccessToast('Integration reconnected successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Failed to Reconnect Integration');
        },
    });
};

// ==================== OAuth Hooks ====================

/**
 * Initiate OAuth flow for Shopify/other platforms
 */
export const useInitiateOAuth = () => {
    return useMutation<OAuthInitiateResponse, Error, { type: IntegrationType; shop?: string }>({
        mutationFn: async (payload) => {
            const response = await apiClient.post('/integrations/oauth/initiate', payload);
            return response.data.data;
        },
        onSuccess: (data) => {
            // Redirect to OAuth URL
            window.location.href = data.authUrl;
        },
        onError: (error) => {
            handleApiError(error, 'Failed to Initiate OAuth');
        },
    });
};

/**
 * Complete OAuth flow and create integration
 */
export const useCompleteOAuth = () => {
    const queryClient = useQueryClient();

    return useMutation<OAuthCompleteResponse, Error, OAuthCallbackPayload>({
        mutationFn: async (payload) => {
            const response = await apiClient.post('/integrations/oauth/callback', payload);
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.ecommerce.integrations() });
            showSuccessToast('OAuth authentication successful');
        },
        onError: (error) => {
            handleApiError(error, 'OAuth Authentication Failed');
        },
    });
};

/**
 * Pause/resume integration syncing
 */
export const useToggleIntegrationSync = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, { integrationId: string; isPaused: boolean }>({
        mutationFn: async ({ integrationId, isPaused }) => {
            await apiClient.patch(`/integrations/${integrationId}/toggle-sync`, { isPaused });
        },
        onSuccess: (_, { integrationId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.ecommerce.integration(integrationId) });
            showSuccessToast('Sync status updated');
        },
        onError: (error) => {
            handleApiError(error, 'Failed to Update Sync Status');
        },
    });
};
