import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../client';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';

export interface Integration {
    id: string;
    name: string;
    platform: 'shopify' | 'woocommerce' | 'magento' | 'wix' | 'custom';
    status: 'active' | 'inactive' | 'error' | 'syncing';
    lastSync: string;
    icon?: string;
}

export interface IntegrationsResponse {
    integrations: Integration[];
}

/**
 * Fetch connected store integrations
 */
export const useIntegrations = (options?: UseQueryOptions<IntegrationsResponse, ApiError>) => {
    return useQuery<IntegrationsResponse, ApiError>({
        queryKey: queryKeys.integrations.all(),
        queryFn: async () => {
            const response = await apiClient.get('/integrations');
            return response.data.data;
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};
