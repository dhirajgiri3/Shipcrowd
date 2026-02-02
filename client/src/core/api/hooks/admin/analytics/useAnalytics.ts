/**
 * Analytics Domain Hooks
 * Contains both data fetching and page controller logic.
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, DateRange } from '../../../clients/analyticsApi'; // Adjust path
import { queryKeys } from '../../../config/query-keys'; // Adjust path
import { QUERY_CONFIG } from '../../../config/query-client'; // Adjust path
import { RETRY_CONFIG } from '../../../config/cache.config'; // Adjust path

// ==========================================
// DATA LAYER (API Hooks)
// ==========================================

/**
 * Hook to fetch delivery performance metrics
 */
export const useDeliveryPerformance = (dateRange: DateRange) => {
    return useQuery({
        queryKey: queryKeys.analytics.dashboard(dateRange),
        queryFn: () => analyticsApi.getDeliveryPerformance(dateRange),
        staleTime: QUERY_CONFIG.staleTime.analytics,
        retry: RETRY_CONFIG.DEFAULT,
    });
};

/**
 * Hook to fetch zone-wise distribution
 */
export const useZoneDistribution = () => {
    return useQuery({
        queryKey: queryKeys.analytics.geographic(),
        queryFn: () => analyticsApi.getZoneDistribution(),
        staleTime: QUERY_CONFIG.staleTime.analytics,
        retry: RETRY_CONFIG.DEFAULT,
    });
};

// ==========================================
// CONTROL LAYER (Page Controller)
// ==========================================

export type DateRangeOption = '7d' | '30d' | 'month';

export function useAnalyticsPage() {
    const [dateRange, setDateRange] = useState<string>('7d');

    // Calculate date range
    const { startDate, endDate } = useMemo(() => {
        const end = new Date();
        const start = new Date();

        switch (dateRange) {
            case '7d':
                start.setDate(start.getDate() - 7);
                break;
            case '30d':
                start.setDate(start.getDate() - 30);
                break;
            case 'month':
                start.setDate(1);
                break;
        }

        return {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0]
        };
    }, [dateRange]);

    // Use co-located data hooks
    const { data: deliveryData, isLoading: isLoadingDelivery } = useDeliveryPerformance({ startDate, endDate });
    const { data: zoneData, isLoading: isLoadingZones } = useZoneDistribution();

    const deliveryPerformanceData = deliveryData?.data || [];
    const zoneDistribution = zoneData?.data || [];

    const handleDateRangeChange = (value: string) => {
        setDateRange(value);
    };

    return {
        dateRange,
        handleDateRangeChange,
        deliveryPerformanceData,
        zoneDistribution,
        isLoadingDelivery,
        isLoadingZones,
    };
}
