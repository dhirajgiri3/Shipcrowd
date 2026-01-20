import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../client';
import { queryKeys } from '../../config/query-keys';

export interface RecentCustomer {
    id: string;
    name: string;
    phone: string;
    email?: string;
    city: string;
    state: string;
    postalCode: string;
    addressLine1: string;
    addressLine2?: string;
    country?: string;
    totalOrders: number;
    lastOrderDate: string;
    avgOrderValue: number;
    preferredPayment: 'cod' | 'prepaid';
}

interface UseRecentCustomersOptions {
    limit?: number;
}

/**
 * Hook to fetch recent customers for Quick Create feature
 * Returns customers sorted by last order date
 */
export const useRecentCustomers = (options: UseRecentCustomersOptions = {}) => {
    const { limit = 5 } = options;

    return useQuery<RecentCustomer[]>({
        queryKey: queryKeys.analytics.recentCustomers(limit),
        queryFn: async () => {
            try {
                const response = await apiClient.get('/analytics/recent-customers', {
                    params: { limit },
                });
                // Backend returns { success: true, data: [...customers...] }
                return (response.data || []) as RecentCustomer[];
            } catch (error) {
                // Return empty array on error to prevent undefined
                console.error('[Recent Customers] Failed to fetch:', error);
                return [];
            }
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 2,
        gcTime: 15 * 60 * 1000, // Cache for 15 minutes
    });
};

export default useRecentCustomers;
