/**
 * Custom hook for order analytics
 * Fetches 30-day order trend data from analytics API
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/src/core/api/http';
import { queryKeys } from '@/src/core/api/config/query-keys';

export interface OrderTrendData {
    _id: string;  // Date (YYYY-MM-DD)
    orders: number;
    revenue: number;
}

export interface OrderAnalyticsResponse {
    ordersByDate: OrderTrendData[];
    ordersByStatus: Array<{ _id: string; count: number }>;
    ordersByPayment: Array<{ _id: string; count: number; total: number }>;
    period: { days: number; startDate: Date; endDate: Date };
}

/**
 * Fetch order trends for specified number of days
 */
export function useOrderTrends(days: number = 30) {
    const safeDays = Math.max(1, Math.floor(days || 30));

    return useQuery({
        queryKey: ['analytics', 'orders', { days: safeDays }],
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: OrderAnalyticsResponse }>(`/analytics/orders`, {
                params: { days: safeDays }
            });
            return data.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 2,
    });
}
