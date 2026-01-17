import { apiClient, ApiError } from '../../config/client';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';

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
        queryKey: ['integrations'],
        // Mocking the API response for now as backend endpoint might not exist yet
        queryFn: async () => {
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 800));

            // Mock data matched to what was hardcoded
            return {
                integrations: [
                    {
                        id: 'int_1',
                        name: 'Shopify Store',
                        platform: 'shopify',
                        status: 'active',
                        lastSync: new Date(Date.now() - 1000 * 60 * 2).toISOString(), // 2 mins ago
                    },
                    {
                        id: 'int_2',
                        name: 'WooCommerce',
                        platform: 'woocommerce',
                        status: 'active',
                        lastSync: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
                    }
                ]
            };

            // TODO: Uncomment when backend is ready
            // const response = await apiClient.get('/integrations');
            // return response.data;
        },
        staleTime: 60000,
        ...options,
    });
};
