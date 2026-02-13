import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../http";
import { useAuth } from '@/src/features/auth/hooks/useAuth';

/**
 * Geographic Insights Hook
 * 
 * Provides city and regional distribution of orders
 */

export interface CityMetric {
    city: string;
    state: string;
    orders: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
    trendValue: number;
}

export interface RegionMetric {
    region: 'North' | 'South' | 'East' | 'West' | 'Northeast' | 'Central';
    orders: number;
    percentage: number;
    color: string;
}

export interface GeographicInsightsData {
    topCities: CityMetric[];
    regions: RegionMetric[];
    totalOrders: number;
}

interface GeographicFilters {
    startDate?: string;
    endDate?: string;
}

export function useGeographicInsights(filters?: GeographicFilters, options?: { enabled?: boolean }) {
    const { isInitialized, user } = useAuth();
    const hasCompanyContext = isInitialized && !!user?.companyId;
    const enabled = hasCompanyContext && (options?.enabled !== false);

    return useQuery({
        queryKey: ["geographic-insights", filters],
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: GeographicInsightsData }>(
                '/analytics/geography',
                { params: filters }
            );
            return data.data;
        },
        enabled,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: false,
    });
}
