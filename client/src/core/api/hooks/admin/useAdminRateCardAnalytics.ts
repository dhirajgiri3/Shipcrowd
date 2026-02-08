import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/src/core/api/http';

export interface AdminRateCardUsageStats {
    totalShipments: number;
    totalRevenue: number;
    averageCost: number;
    zoneDistribution: Record<string, number>;
    topCarriers: Array<{ carrier: string; count: number }>;
    topCustomers: Array<{ customerId: string; count: number; revenue: number }>;
}

export interface AdminRevenueDataPoint {
    date: string;
    revenue: number;
    count: number;
}

export interface AdminRateCardHistoryItem {
    id: string;
    user?: {
        name?: string;
        email?: string;
    };
    action: string;
    resource: string;
    resourceId: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    timestamp: string;
}

interface AnalyticsParams {
    rateCardId: string;
    startDate?: Date;
    endDate?: Date;
}

interface RevenueSeriesParams extends AnalyticsParams {
    granularity?: 'day' | 'week' | 'month';
}

interface HistoryParams {
    rateCardId: string;
    page?: number;
    limit?: number;
}

export const useAdminRateCardAnalytics = ({ rateCardId, startDate, endDate }: AnalyticsParams) => {
    return useQuery({
        queryKey: ['admin', 'ratecards', 'analytics', rateCardId, startDate?.toISOString(), endDate?.toISOString()],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate.toISOString());
            if (endDate) params.append('endDate', endDate.toISOString());

            const response = await apiClient.get<{ data: { stats: AdminRateCardUsageStats } }>(
                `/admin/ratecards/${rateCardId}/analytics?${params.toString()}`
            );
            return response.data.data.stats;
        },
        enabled: !!rateCardId,
    });
};

export const useAdminRateCardRevenueSeries = ({
    rateCardId,
    startDate,
    endDate,
    granularity = 'day'
}: RevenueSeriesParams) => {
    return useQuery({
        queryKey: ['admin', 'ratecards', 'revenue-series', rateCardId, startDate?.toISOString(), endDate?.toISOString(), granularity],
        queryFn: async () => {
            if (!startDate || !endDate) {
                throw new Error('Start date and end date are required');
            }

            const params = new URLSearchParams({
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                granularity,
            });

            const response = await apiClient.get<{ data: { timeSeries: AdminRevenueDataPoint[] } }>(
                `/admin/ratecards/${rateCardId}/revenue-series?${params.toString()}`
            );
            return response.data.data.timeSeries;
        },
        enabled: !!rateCardId && !!startDate && !!endDate,
    });
};

export const useAdminRateCardHistory = ({ rateCardId, page = 1, limit = 20 }: HistoryParams) => {
    return useQuery({
        queryKey: ['admin', 'ratecards', 'history', rateCardId, page, limit],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(limit),
            });
            const response = await apiClient.get<{ data: AdminRateCardHistoryItem[]; pagination: any }>(
                `/admin/ratecards/${rateCardId}/history?${params.toString()}`
            );
            return {
                items: response.data.data || [],
                pagination: response.data.pagination || {},
            };
        },
        enabled: !!rateCardId,
    });
};
