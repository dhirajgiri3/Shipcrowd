import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';

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

// Mock analytics data
const mockAnalyticsData: AnalyticsData = {
    revenue: 524300,
    orders: 1925,
    avgOrderValue: 272,
    activeShipments: 342,
    deliveryRate: 94.5,
    rtoRate: 5.5,
    revenueGrowth: 14.5,
    ordersGrowth: 8.2,
    topCouriers: [
        { name: 'Delhivery', count: 856, percentage: 44 },
        { name: 'DTDC', count: 512, percentage: 27 },
        { name: 'Xpressbees', count: 357, percentage: 19 },
        { name: 'Bluedart', count: 200, percentage: 10 },
    ],
    orderTrend: [
        { date: '2024-12-18', orders: 45, revenue: 12000 },
        { date: '2024-12-19', orders: 58, revenue: 15200 },
        { date: '2024-12-20', orders: 52, revenue: 13800 },
        { date: '2024-12-21', orders: 68, revenue: 18500 },
        { date: '2024-12-22', orders: 61, revenue: 16200 },
        { date: '2024-12-23', orders: 82, revenue: 21000 },
        { date: '2024-12-24', orders: 95, revenue: 23500 },
    ],
    statusDistribution: [
        { status: 'Delivered', count: 1250, color: '#10B981' },
        { status: 'In Transit', count: 380, color: '#3B82F6' },
        { status: 'Pending', count: 210, color: '#F59E0B' },
        { status: 'RTO', count: 85, color: '#EF4444' },
    ],
};

interface UseAnalyticsOptions {
    period?: '7d' | '30d' | '90d';
    useMockData?: boolean;
}

/**
 * Hook to fetch seller analytics data
 * Uses mock data as fallback if API is unavailable
 */
export const useAnalytics = (options: UseAnalyticsOptions = {}) => {
    const { period = '30d', useMockData = false } = options;

    return useQuery<AnalyticsData>({
        queryKey: ['analytics', period],
        queryFn: async () => {
            if (useMockData) {
                return mockAnalyticsData;
            }

            try {
                const response = await apiClient.get('/analytics/dashboard', {
                    params: { period },
                });
                return response.data as AnalyticsData;
            } catch (error) {
                console.warn('Falling back to mock analytics data');
                return mockAnalyticsData;
            }
        },
        staleTime: 300000, // 5 minutes
        retry: 1,
    });
};

export default useAnalytics;
