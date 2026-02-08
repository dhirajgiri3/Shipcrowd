import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/src/core/api/http';

export interface RateCardUsageStats {
    totalShipments: number;
    totalRevenue: number;
    averageCost: number;
    zoneDistribution: Record<string, number>;
    topCarriers: Array<{ carrier: string; count: number }>;
    topCustomers: Array<{ customerId: string; count: number; revenue: number }>;
}

export interface RevenueDataPoint {
    date: string;
    revenue: number;
    count: number;
}

interface RateCardAnalyticsParams {
    rateCardId: string;
    startDate?: Date;
    endDate?: Date;
}

interface RevenueSeriesParams extends RateCardAnalyticsParams {
    granularity?: 'day' | 'week' | 'month';
}

export const useRateCardAnalytics = ({ rateCardId, startDate, endDate }: RateCardAnalyticsParams) => {
    return useQuery({
        queryKey: ['rate-card-analytics', rateCardId, startDate?.toISOString(), endDate?.toISOString()],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate.toISOString());
            if (endDate) params.append('endDate', endDate.toISOString());

            const response = await apiClient.get<{ data: { stats: RateCardUsageStats } }>(
                `/ratecards/${rateCardId}/analytics?${params.toString()}`
            );
            return response.data.data.stats;
        },
        enabled: !!rateCardId,
    });
};

export const useRateCardRevenueSeries = ({
    rateCardId,
    startDate,
    endDate,
    granularity = 'day'
}: RevenueSeriesParams) => {
    return useQuery({
        queryKey: ['rate-card-revenue-series', rateCardId, startDate?.toISOString(), endDate?.toISOString(), granularity],
        queryFn: async () => {
            if (!startDate || !endDate) {
                throw new Error('Start date and end date are required');
            }

            const params = new URLSearchParams({
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                granularity,
            });

            const response = await apiClient.get<{ data: { timeSeries: RevenueDataPoint[] } }>(
                `/ratecards/${rateCardId}/revenue-series?${params.toString()}`
            );
            return response.data.data.timeSeries;
        },
        enabled: !!rateCardId && !!startDate && !!endDate,
    });
};
