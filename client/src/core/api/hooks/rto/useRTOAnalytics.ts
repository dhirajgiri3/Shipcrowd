import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { apiClient } from '../../http';
import { queryKeys } from '../../config/query-keys';

export interface RTOAnalyticsFilters {
    startDate?: string;
    endDate?: string;
    warehouseId?: string;
    rtoReason?: string;
}

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
        periodLabel: string;
    };
    stats: {
        total: number;
        byStatus: Record<string, number>;
        byReason: Record<string, number>;
        totalCharges: number;
        avgCharges: number;
        restockRate: number;
        dispositionBreakdown: Record<string, number>;
        avgQcTurnaroundHours?: number;
    };
    trend: Array<{ month: string; rate: number }>;
    byCourier: RTOByCourier[];
    byReason: RTOByReason[];
    recommendations: RTORecommendation[];
    period: {
        startDate: string;
        endDate: string;
    };
}

export function useRTOAnalytics(filters?: RTOAnalyticsFilters, options?: { enabled?: boolean }) {
    const { isInitialized, user } = useAuth();
    const hasCompanyContext = isInitialized && !!user?.companyId;
    const enabled = hasCompanyContext && (options?.enabled !== false);

    return useQuery({
        queryKey: queryKeys.rto.analytics(filters),
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: RTOAnalyticsData }>(
                '/rto/analytics',
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
