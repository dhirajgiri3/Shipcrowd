import { apiClient } from '../../http';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import {
    useQuery,
    UseQueryOptions,
} from '@tanstack/react-query';

// --- Types based on Backend Service ---

export interface StoreHealth {
    storeId: string;
    storeName: string;
    storeUrl?: string;
    platform: string;
    isActive: boolean;
    isPaused: boolean;
    lastSyncAt?: string; // Serialized as string from API
    syncStatus?: string;
    errorCount24h: number;
    errorCount7d: number;
    syncSuccessRate?: number;
    webhooksActive: number;
    webhooksTotal: number;
    companyId?: string;
}

export interface PlatformHealth {
    platform: 'shopify' | 'woocommerce' | 'amazon' | 'flipkart';
    totalStores: number;
    activeStores: number;
    pausedStores: number;
    inactiveStores: number;
    stores: StoreHealth[];
    overallErrorRate: number;
    overallSuccessRate: number;
}

export interface IntegrationHealthResponse {
    companyId: string;
    timestamp: string;
    platforms: {
        shopify?: PlatformHealth;
        woocommerce?: PlatformHealth;
        amazon?: PlatformHealth;
        flipkart?: PlatformHealth;
    };
    summary: {
        totalStores: number;
        activeStores: number;
        healthyStores: number;
        unhealthyStores: number;
    };
    integrations?: any[]; // Added to match UI expectation
}

// --- Hooks ---

/**
 * Fetch integration health status for admin dashboard (platform-wide or company-scoped).
 * @param companyId - Optional. Filter by company; omit for platform-wide view.
 */
export const useIntegrationHealth = (
    companyId?: string,
    options?: UseQueryOptions<IntegrationHealthResponse, any>
) => {
    return useQuery<IntegrationHealthResponse, any>({
        queryKey: ['admin', 'integrations', 'health', companyId ?? 'all'],
        queryFn: async () => {
            const params = companyId ? { companyId } : {};
            const response = await apiClient.get('/admin/integrations/health', { params });
            const raw = response.data?.data;
            if (!raw) return raw;
            return {
                ...raw,
                timestamp: raw.timestamp ?? new Date().toISOString(),
                summary: {
                    totalStores: raw.summary?.totalStores ?? 0,
                    activeStores: raw.summary?.activeStores ?? 0,
                    healthyStores: raw.summary?.healthyStores ?? 0,
                    unhealthyStores: raw.summary?.unhealthyStores ?? 0,
                },
                platforms: raw.platforms ?? {},
            } as IntegrationHealthResponse;
        },
        retry: 1,
        ...options,
    });
};

export const useIntegrations = useIntegrationHealth;
