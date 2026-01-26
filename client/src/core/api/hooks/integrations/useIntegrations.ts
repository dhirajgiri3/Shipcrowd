import { apiClient } from '@/src/lib/api-client';
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
 * Fetch integration health status for dashboard
 */
export const useIntegrationHealth = (options?: UseQueryOptions<IntegrationHealthResponse, any>) => {
    return useQuery<IntegrationHealthResponse, any>({
        queryKey: ['integrations', 'health'], // Fallback query key
        queryFn: async () => {
            const response = await apiClient.get('/integrations/health');
            return response.data;
        },
        // ...CACHE_TIMES.SHORT, 
        retry: 1,
        ...options,
    });
};

export const useIntegrations = useIntegrationHealth;
