import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import { queryKeys } from '../queryKeys';

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
            const response = await apiClient.get('/analytics/recent-customers', {
                params: { limit },
            });
            return response.data.customers as RecentCustomer[];
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 2,
        gcTime: 15 * 60 * 1000, // Cache for 15 minutes
    });
};

export default useRecentCustomers;
