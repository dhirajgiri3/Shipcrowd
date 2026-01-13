import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import { queryKeys } from '../queryKeys';

export interface AnalyticsData {
    revenue: number;
    orders: number;
    avgOrderValue: number;
    activeShipments: number;
    deliveryRate: number;
    rtoRate: number;
    revenueGrowth: number;
    ordersGrowth: number;
    topCouriers: Array<{ name: string; count: number; percentage: number }>;
    orderTrend: Array<{ date: string; orders: number; revenue: number }>;
    statusDistribution: Array<{ status: string; count: number; color: string }>;
}

interface UseAnalyticsOptions {
    period?: '7d' | '30d' | '90d' | '1y';
}

/**
 * Hook to fetch seller analytics dashboard data
 * @param options - Options including period for date range
 * @returns Query result with analytics data
 */
export const useAnalytics = (options: UseAnalyticsOptions = {}) => {
    const { period = '30d' } = options;

    return useQuery<AnalyticsData>({
        queryKey: queryKeys.analytics.dashboard(period as any),
        queryFn: async () => {
            const response = await apiClient.get('/analytics/dashboard', {
                params: { period },
            });
            return response.data as AnalyticsData;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 2,
        gcTime: 30 * 60 * 1000, // Cache for 30 minutes
    });
};

export default useAnalytics;
