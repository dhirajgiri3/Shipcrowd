import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../http";
import { useAuth } from '@/src/features/auth/hooks/useAuth';

/**
 * RTO Analytics Hook
 * 
 * Provides comprehensive RTO data for dashboard:
 * - Current/previous rate comparison
 * - 6-month trend
 * - Courier breakdown with performance labels
 * - Reason distribution
 * - Actionable recommendations
 */

interface RTOByCourier {
    courier: string;
    rate: number;
    count: number;
    total: number;
}

interface RTOByReason {
    reason: string;
    label: string;
    percentage: number;
    count: number;
    // ...
}

interface RTORecommendation {
    type: string;
    message: string;
    impact?: string;
}

export interface RTOAnalyticsData {
    summary: {
        currentRate: number;
        previousRate: number;
        change: number;
        industryAverage: number;
        totalRTO: number;
        totalOrders: number;
        estimatedLoss: number;
    };
    trend: Array<{ month: string; rate: number }>;
    byCourier: RTOByCourier[];
    byReason: RTOByReason[];
    recommendations: RTORecommendation[];
}

export function useRTOAnalytics(options?: { enabled?: boolean }) {
    const { isInitialized, user } = useAuth();
    const hasCompanyContext = isInitialized && !!user?.companyId;
    const enabled = hasCompanyContext && (options?.enabled !== false);

    return useQuery({
        queryKey: ["rto-analytics"],
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: RTOAnalyticsData }>(
                '/analytics/rto'
            );
            return data.data;
        },
        enabled,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: false,
    });
}
