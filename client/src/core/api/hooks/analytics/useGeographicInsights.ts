import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../http";

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

export function useGeographicInsights() {
    return useQuery({
        queryKey: ["geographic-insights"],
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: GeographicInsightsData }>(
                '/analytics/geography'
            );
            return data.data;
        },
        // Cache for 5 minutes
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: false,
    });
}
