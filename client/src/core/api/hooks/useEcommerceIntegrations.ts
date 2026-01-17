/**
 * E-Commerce Integrations API Hooks
 * 
 * React Query hooks for marketplace integrations, OAuth flows,
 * field mapping, and order synchronization.
 * Backend: GET/POST /api/v1/integrations/*
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '@/src/core/api/config/client';
import { queryKeys } from '../config/queryKeys';
import { CACHE_TIMES, RETRY_CONFIG } from '../config/cacheConfig';
import { handleApiError, showSuccessToast } from '@/src/lib/error-handler';

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
} from '@/src/types/api/integrations.types';

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
            const response = await apiClient.get('/integrations', { params: filters });
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
    return useQuery<EcommerceIntegration>({
        queryKey: queryKeys.ecommerce.integration(integrationId),
        queryFn: async () => {
            const response = await apiClient.get(`/integrations/${integrationId}`);
            return response.data.data;
        },
        enabled: !!integrationId,
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Get sync logs for an integration
 */
export const useSyncLogs = (
    integrationId: string,
    options?: Omit<UseQueryOptions<SyncLog[]>, 'queryKey' | 'queryFn'>
) => {
    return useQuery<SyncLog[]>({
        queryKey: queryKeys.ecommerce.syncLogs(integrationId),
        queryFn: async () => {
            const response = await apiClient.get(`/integrations/${integrationId}/sync-logs`);
            return response.data.data;
        },
        enabled: !!integrationId,
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

// ==================== Mutation Hooks ====================

/**
 * Create a new e-commerce integration
 */
export const useCreateIntegration = () => {
    const queryClient = useQueryClient();

    return useMutation<EcommerceIntegration, Error, CreateIntegrationPayload>({
        mutationFn: async (payload) => {
            const response = await apiClient.post('/integrations', payload);
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.ecommerce.integrations() });
            showSuccessToast('Integration connected successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Failed to Connect Integration');
        },
    });
};

/**
 * Update integration settings or field mapping
 */
export const useUpdateIntegration = () => {
    const queryClient = useQueryClient();

    return useMutation<EcommerceIntegration, Error, UpdateIntegrationPayload>({
        mutationFn: async ({ integrationId, ...payload }) => {
            const response = await apiClient.put(`/integrations/${integrationId}`, payload);
            return response.data.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.ecommerce.integration(data.integrationId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.ecommerce.integrations() });
            showSuccessToast('Integration updated successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Failed to Update Integration');
        },
    });
};

/**
 * Delete/disconnect an integration
 */
export const useDeleteIntegration = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, string>({
        mutationFn: async (integrationId) => {
            await apiClient.delete(`/integrations/${integrationId}`);
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
 */
export const useTestConnection = () => {
    return useMutation<TestConnectionResponse, Error, TestConnectionPayload>({
        mutationFn: async (payload) => {
            const response = await apiClient.post('/integrations/test-connection', payload);
            return response.data.data;
        },
        onSuccess: (data) => {
            if (data.success) {
                showSuccessToast(`Connection successful! Found store: ${data.storeName}`);
            }
        },
        onError: (error) => {
            handleApiError(error, 'Connection Test Failed');
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
            const response = await apiClient.post(`/integrations/${payload.integrationId}/sync`, payload);
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
