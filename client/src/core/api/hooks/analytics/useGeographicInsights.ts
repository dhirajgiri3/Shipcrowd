import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5005/api/v1";

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
            const { data } = await axios.get<{ success: boolean; data: GeographicInsightsData }>(
                `${API_BASE_URL}/analytics/geography`,
                { withCredentials: true }
            );
            return data.data;
        },
        // Cache for 5 minutes
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
}
