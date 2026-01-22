import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5005/api/v1";

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
            const { data } = await axios.get<{ success: boolean; data: ProfitabilityData }>(
                `${API_BASE_URL}/analytics/profitability`,
                { withCredentials: true }
            );
            return data.data;
        },
        // Cache for 5 minutes
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
}
