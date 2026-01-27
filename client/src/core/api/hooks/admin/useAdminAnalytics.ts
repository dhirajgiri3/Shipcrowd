/**
 * Admin Analytics Hooks
 * Hooks for analytics and reporting
 */

import { useQuery } from '@tanstack/react-query';
import { analyticsApi, DateRange } from '../../clients/analyticsApi';
import { queryKeys } from '../../config/query-keys';
import { QUERY_CONFIG } from '../../config/query-client';
import { RETRY_CONFIG } from '../../config/cache.config';

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
