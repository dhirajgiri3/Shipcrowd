/**
 * E-Commerce Integrations API Hooks
 *
 * React Query hooks for marketplace integrations, OAuth flows,
 * field mapping, and order synchronization.
 * Backend: GET/POST /api/v1/integrations/*
 *
 * ==================== PLATFORM API COVERAGE ====================
 *
 * Feature Availability Matrix:
 *
 * | Feature              | Shopify | WooCommerce | Amazon      | Flipkart    |
 * |----------------------|---------|-------------|-------------|-------------|
 * | OAuth Flow           | ✅ Yes  | ❌ No       | ❌ No       | ❌ No       |
 * | List Stores          | ✅ Yes  | ✅ Yes      | ✅ Yes      | ✅ Yes      |
 * | Get Store Details    | ✅ Yes  | ✅ Yes      | ✅ Yes      | ✅ Yes      |
 * | Test Connection      | ✅ Yes  | ✅ Yes      | ✅ Yes      | ✅ Yes      |
 * | Disconnect Store     | ✅ Yes  | ✅ Yes      | ✅ Yes      | ✅ Yes      |
 * | Update Settings      | ✅ Yes  | ✅ Yes      | ✅ Yes      | ✅ Yes      |
 * | Sync Logs            | ✅ Yes  | ✅ Yes      | ✅ Yes      | ✅ Yes      |
 * | Manual Sync          | ✅ Yes  | ✅ Yes      | ✅ Yes      | ✅ Yes      |
 * | Pause/Resume Sync    | ✅ Yes  | ✅ Yes      | ✅ Yes      | ✅ Yes      |
 * | Refresh Credentials  | ❌ OAuth| ✅ Yes      | ✅ Yes      | ⚠️ Limited  |
 *
 * * All platforms use `/sync/orders` endpoint
 *
 * Connection Methods:
 * - Shopify: OAuth (useInitiateOAuth → OAuth callback)
 * - WooCommerce: Direct (API credentials via useCreateIntegration)
 * - Amazon: Direct (MWS credentials via useCreateIntegration)
 * - Flipkart: Direct (API credentials via useCreateIntegration)
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/src/core/api/http';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';

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

const normalizePlatformPayload = (payload: CreateIntegrationPayload | TestConnectionPayload) => {
    switch (payload.type) {
        case 'WOOCOMMERCE': {
            const credentials = payload.credentials as any;
            return {
                storeUrl: credentials.storeUrl || credentials.siteUrl,
                consumerKey: credentials.consumerKey,
                consumerSecret: credentials.consumerSecret,
                storeName: (payload as any).storeName,
                settings: (payload as any).settings,
                fieldMapping: (payload as any).fieldMapping,
            };
        }
        case 'AMAZON': {
            const credentials = payload.credentials as any;
            return {
                sellerId: credentials.sellerId,
                marketplaceId: credentials.marketplaceId,
                sellerName: (payload as any).storeName || credentials.sellerName,
                sellerEmail: credentials.sellerEmail,
                lwaClientId: credentials.lwaClientId,
                lwaClientSecret: credentials.lwaClientSecret,
                lwaRefreshToken: credentials.lwaRefreshToken,
                awsAccessKeyId: credentials.awsAccessKeyId,
                awsSecretAccessKey: credentials.awsSecretAccessKey,
                roleArn: credentials.roleArn,
                region: credentials.region,
                settings: (payload as any).settings,
                fieldMapping: (payload as any).fieldMapping,
            };
        }
        case 'FLIPKART': {
            const credentials = payload.credentials as any;
            return {
                sellerId: credentials.sellerId || credentials.accessToken,
                sellerName: (payload as any).storeName,
                sellerEmail: credentials.sellerEmail,
                apiKey: credentials.apiKey || credentials.appId,
                apiSecret: credentials.apiSecret || credentials.appSecret,
                settings: (payload as any).settings,
                fieldMapping: (payload as any).fieldMapping,
            };
        }
        case 'SHOPIFY':
        default:
            return payload;
    }
};

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
            // We need to fetch from all platforms because they have separate endpoints
            const platforms = ['shopify', 'woocommerce', 'amazon', 'flipkart'];

            // If a specific type is filtered, only fetch that
            const targetPlatforms = filters?.type
                ? [filters.type.toLowerCase()]
                : platforms;

            const promises = targetPlatforms.map(platform =>
                apiClient.get(`/integrations/${platform}/stores`, { params: filters })
                    .then(res => {
                        // Handle different response structures
                        const data = res.data.data;
                        
                        // If it's an array of stores directly
                        if (Array.isArray(data)) {
                            return data.map((store: any) => ({
                                ...store,
                                integrationId: store.storeId || store._id || store.id,
                                type: platform.toUpperCase() as IntegrationType,
                            }));
                        }
                        
                        // If it's a wrapper object with stores array
                        if (data && Array.isArray(data.stores)) {
                            return data.stores.map((store: any) => ({
                                ...store,
                                integrationId: store.storeId || store._id || store.id,
                                type: platform.toUpperCase() as IntegrationType,
                            }));
                        }
                        
                        return [];
                    })
                    .catch(err => {
                        console.warn(`Failed to fetch ${platform} stores:`, err);
                        return [];
                    })
            );

            const results = await Promise.all(promises);
            return results.flat();
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
    type?: IntegrationType, // Added type to construct correct URL
    options?: Omit<UseQueryOptions<EcommerceIntegration>, 'queryKey' | 'queryFn'>
) => {
    // Prevent query if integrationId is "new" or invalid
    const isValidId = Boolean(integrationId && integrationId !== 'new' && integrationId.length === 24);
    // Default to 'shopify' if type is missing to maintain backward compatibility (or throw error)
    const platform = type ? type.toLowerCase() : 'shopify';

    return useQuery<EcommerceIntegration>({
        queryKey: queryKeys.ecommerce.integration(integrationId),
        queryFn: async () => {
            const response = await apiClient.get(`/integrations/${platform}/stores/${integrationId}`);
            const data = response.data.data;
            
            // Handle nested store object (Shopify returns { store: {...}, recentLogs: [...] })
            if (data.store) {
                return {
                    ...data.store,
                    _id: data.store._id || data.store.id || data.store.storeId,
                    integrationId: data.store.storeId || data.store._id || data.store.id,
                };
            }
            
            // Direct store object
            return {
                ...data,
                integrationId: data.storeId || data._id || data.id,
            };
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
/**
 * Get sync logs for an integration
 *
 * All platforms now expose /sync/logs with platform-specific adapters.
 */
export const useSyncLogs = (
    integrationId: string,
    type?: IntegrationType,
    options?: Omit<UseQueryOptions<SyncLog[]>, 'queryKey' | 'queryFn'>
) => {
    // Prevent query if integrationId is "new" or invalid
    const isValidId = Boolean(integrationId && integrationId !== 'new' && integrationId.length === 24);
    const platform = type ? type.toLowerCase() : 'shopify';

    return useQuery<SyncLog[]>({
        queryKey: queryKeys.ecommerce.syncLogs(integrationId),
        queryFn: async () => {
            const response = await apiClient.get(`/integrations/${platform}/stores/${integrationId}/sync/logs`);
            const data = response.data.data;
            return Array.isArray(data) ? data : (data?.logs ?? []);
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
        enabled: isValidId && (options?.enabled !== false),
    });
};

// ==================== Mutation Hooks ====================

/**
 * Create a new e-commerce integration
 *
 * Routes to platform-specific endpoints:
 * - Shopify: Handled via OAuth callback, not this endpoint
 * - WooCommerce: POST /integrations/woocommerce/install
 * - Amazon: POST /integrations/amazon/connect
 * - Flipkart: POST /integrations/flipkart/connect
 */
export const useCreateIntegration = (options?: UseMutationOptions<EcommerceIntegration, ApiError, CreateIntegrationPayload>) => {
    const queryClient = useQueryClient();

    return useMutation<EcommerceIntegration, ApiError, CreateIntegrationPayload>({
        mutationFn: async (payload) => {
            let endpoint: string;

            // Route to the correct platform-specific endpoint
            switch (payload.type) {
                case 'SHOPIFY':
                    // Shopify is handled via OAuth callback, but if called directly:
                    endpoint = '/integrations/shopify/stores';
                    break;
                case 'WOOCOMMERCE':
                    endpoint = '/integrations/woocommerce/install';
                    break;
                case 'AMAZON':
                    endpoint = '/integrations/amazon/connect';
                    break;
                case 'FLIPKART':
                    endpoint = '/integrations/flipkart/connect';
                    break;
                default:
                    throw new Error(`Unsupported integration type: ${payload.type}`);
            }

            const response = await apiClient.post(endpoint, normalizePlatformPayload(payload));
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.ecommerce.integrations() });
            queryClient.invalidateQueries({ queryKey: queryKeys.integrations.health() });
        },
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Update integration settings or field mapping
 */
/**
 * Update integration settings or field mapping
 *
 * Now supports all platforms with PATCH /stores/:id/settings endpoints
 */
export const useUpdateIntegration = (options?: UseMutationOptions<EcommerceIntegration, ApiError, UpdateIntegrationPayload>) => {
    const queryClient = useQueryClient();

    return useMutation<EcommerceIntegration, ApiError, UpdateIntegrationPayload>({
        mutationFn: async ({ integrationId, type, ...payload }) => {
            const platform = type ? type.toLowerCase() : 'shopify';

            const response = await apiClient.patch(`/integrations/${platform}/stores/${integrationId}/settings`, payload);
            return response.data.data;
        },
        onSuccess: (data) => {
            const integrationId = data.integrationId ?? (data as any)._id;
            if (integrationId) {
                queryClient.invalidateQueries({ queryKey: queryKeys.ecommerce.integration(String(integrationId)) });
            }
            queryClient.invalidateQueries({ queryKey: queryKeys.ecommerce.integrations() });
            queryClient.invalidateQueries({ queryKey: ['integrations', 'health'] });
        },
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Delete/disconnect an integration
 */
/**
 * Delete/disconnect an integration
 */
export const useDeleteIntegration = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, { integrationId: string; type?: IntegrationType }>({
        mutationFn: async ({ integrationId, type }) => {
            const platform = type ? type.toLowerCase() : 'shopify';
            await apiClient.delete(`/integrations/${platform}/stores/${integrationId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.ecommerce.integrations() });
            queryClient.invalidateQueries({ queryKey: queryKeys.integrations.health() });
        },
    });
};

/**
 * Test connection credentials before creating integration
 * Enhanced with retry logic, timeout handling, and detailed error reporting
 * 
 * Routes to platform-specific test endpoints:
 * - Shopify: POST /integrations/shopify/stores/:id/test (requires storeId)
 * - WooCommerce: POST /integrations/woocommerce/stores/:id/test
 * - Amazon: POST /integrations/amazon/stores/:id/test
 * - Flipkart: POST /integrations/flipkart/stores/:id/test
 */
export const useTestConnection = () => {
    const [retryCount, setRetryCount] = useState(0);

    return useMutation<TestConnectionResponse, Error, TestConnectionPayload & { integrationId?: string }>({
        mutationFn: async (payload) => {
            const { wrapApiCall } = await import('./apiUtils');
            const { parseIntegrationError, formatErrorMessage } = await import('./integrationErrors');

            return wrapApiCall(
                async () => {
                    const platform = payload.type ? payload.type.toLowerCase() : 'shopify';

                    // If integrationId is provided, use the store-specific test endpoint
                    // This is the case after OAuth callback when the store is already created
                    if (payload.integrationId) {
                        const response = await apiClient.post(`/integrations/${platform}/stores/${payload.integrationId}/test`, {});
                        return response.data.data;
                    }

                    // Fallback to generic test endpoint (if it exists for the platform)
                    // This would be used for testing credentials before creating the integration
                    const response = await apiClient.post(`/integrations/${platform}/test`, normalizePlatformPayload(payload));
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
        onSuccess: () => {
            setRetryCount(0);
        },
        onError: () => {
            setRetryCount(0);
        },
    });
};

/**
 * Trigger manual sync for an integration
 */
/**
 * Trigger manual sync for an integration
 *
 * Endpoint variations by platform:
 * - Shopify: POST /integrations/shopify/stores/:id/sync/orders
 * - WooCommerce: POST /integrations/woocommerce/stores/:id/sync/orders
 * - Amazon: POST /integrations/amazon/stores/:id/sync/orders
 * - Flipkart: POST /integrations/flipkart/stores/:id/sync/orders
 */
export const useTriggerSync = () => {
    const queryClient = useQueryClient();

    return useMutation<SyncLog, Error, TriggerSyncPayload>({
        mutationFn: async (payload) => {
            const platform = payload.type ? payload.type.toLowerCase() : 'shopify';

            const endpoint = `/integrations/${platform}/stores/${payload.integrationId}/sync/orders`;

            const response = await apiClient.post(endpoint, payload);
            return response.data.data;
        },
        onSuccess: (_, { integrationId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.ecommerce.integration(integrationId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.ecommerce.syncLogs(integrationId) });
        },
    });
};

/**
 * Reconnect/refresh integration credentials
 */
/**
 * Reconnect/refresh integration credentials
 */
export const useReconnectIntegration = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, { integrationId: string; type?: IntegrationType; credentials: any }>({
        mutationFn: async ({ integrationId, type, credentials }) => {
            let endpoint = '';
            const platform = type ? type.toLowerCase() : 'shopify';

            // Map to correct endpoint based on type
            switch (type) {
                case 'WOOCOMMERCE':
                    endpoint = `/integrations/woocommerce/stores/${integrationId}/credentials`;
                    await apiClient.put(endpoint, credentials);
                    return;
                case 'AMAZON':
                    endpoint = `/integrations/amazon/stores/${integrationId}/refresh`;
                    await apiClient.post(endpoint, credentials);
                    return;
                case 'FLIPKART':
                    // Assuming similar pattern or re-connect
                    endpoint = `/integrations/flipkart/stores/${integrationId}/test`; // Fallback or distinct route?
                    // Use default behavior for now or throw if not supported
                    throw new Error('Reconnection manual flow not fully supported for Flipkart via this hook yet.');
                case 'SHOPIFY':
                    // Shopify uses OAuth, no manual credential update usually
                    throw new Error('Shopify uses OAuth. Please reconnect via "Add Integration".');
                default:
                    // Try generic or fail
                    throw new Error(`Reconnection not supported for ${type}`);
            }
        },
        onSuccess: (_, { integrationId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.ecommerce.integration(integrationId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.ecommerce.integrations() });
            queryClient.invalidateQueries({ queryKey: queryKeys.integrations.health() });
        },
    });
};

// ==================== OAuth Hooks ====================

/**
 * Initiate OAuth flow for Shopify
 *
 * Note: This hook is specifically for Shopify OAuth flow.
 * Other platforms (WooCommerce, Amazon, Flipkart) use direct credential connection
 * via their respective /connect or /install endpoints.
 */
export const useInitiateOAuth = () => {
    return useMutation<OAuthInitiateResponse, Error, { type: IntegrationType; shop?: string }>({
        mutationFn: async (payload) => {
            // Shopify uses OAuth flow with GET /integrations/shopify/install
            if (payload.type === 'SHOPIFY') {
                if (!payload.shop) {
                    throw new Error('Shop domain is required for Shopify OAuth');
                }
                const response = await apiClient.get('/integrations/shopify/install', {
                    params: { shop: payload.shop }
                });
                return response.data.data;
            }

            // Other platforms (WooCommerce, Amazon, Flipkart) don't use OAuth
            // They should use their respective direct connection methods
            throw new Error(`OAuth flow not supported for ${payload.type}. Please use direct connection.`);
        },
        onSuccess: (data) => {
            // Redirect to OAuth URL
            // Shopify returns 'installUrl', generic OAuth might return 'authUrl'
            const redirectUrl = data.installUrl || data.authUrl;
            if (redirectUrl) {
                window.location.href = redirectUrl;
            } else {
                throw new Error('No redirect URL received from OAuth provider');
            }
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
            queryClient.invalidateQueries({ queryKey: queryKeys.integrations.health() });
        },
    });
};

/**
 * Pause/resume integration syncing
 */
/**
 * Pause/resume integration syncing
 */
export const useToggleIntegrationSync = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, { integrationId: string; type?: IntegrationType; isPaused: boolean }>({
        mutationFn: async ({ integrationId, type, isPaused }) => {
            const platform = type ? type.toLowerCase() : 'shopify';

            // Most platforms use explicit pause/resume endpoints
            const action = isPaused ? 'pause' : 'resume';

            // Exceptions logic can be added here if needed
            // e.g. if (type === 'SHOPIFY') ...

            await apiClient.post(`/integrations/${platform}/stores/${integrationId}/${action}`, {});
        },
        onSuccess: (_, { integrationId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.ecommerce.integration(integrationId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.ecommerce.integrations() });
            queryClient.invalidateQueries({ queryKey: queryKeys.integrations.health() });
        },
    });
};
