import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../http";

/**
 * Profitability Analytics Hook
 * 
 * Provides REAL profit calculation (not fake 15% margin):
 * Profit = Revenue - (Shipping + COD + Platform fees + GST + RTO costs)
 */

export interface ProfitabilityData {
    summary: {
        totalRevenue: number;
        totalCosts: number;
        netProfit: number;
        profitMargin: number;
    };
    breakdown: {
        shippingCosts: number;
        codCharges: number;
        platformFees: number;
        gst: number;
        rtoCosts: number;
        otherCosts?: number;
    };
    averagePerOrder: {
        revenue: number;
        profit: number;
        margin: number;
    };
    comparison?: {
        previousPeriod: {
            margin: number;
            change: number;
        };
    };
}

export function useProfitabilityAnalytics() {
    return useQuery({
        queryKey: ["profitability-analytics"],
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: ProfitabilityData }>(
                '/analytics/profitability'
            );
            return data.data;
        },
        // Cache for 5 minutes
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: false,
    });
}
