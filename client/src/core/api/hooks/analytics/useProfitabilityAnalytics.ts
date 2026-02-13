import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../http";
import { useAuth } from '@/src/features/auth/hooks/useAuth';

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

interface ProfitabilityFilters {
    startDate?: string;
    endDate?: string;
}

export function useProfitabilityAnalytics(filters?: ProfitabilityFilters, options?: { enabled?: boolean }) {
    const { isInitialized, user } = useAuth();
    const hasCompanyContext = isInitialized && !!user?.companyId;
    const enabled = hasCompanyContext && (options?.enabled !== false);

    return useQuery({
        queryKey: ["profitability-analytics", filters],
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: ProfitabilityData }>(
                '/analytics/profitability',
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
