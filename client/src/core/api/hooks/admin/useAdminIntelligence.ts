/**
 * Admin Intelligence Hooks
 * Hooks for AI predictions, anomalies, and insights
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { intelligenceApi } from '../../clients/intelligenceApi';
import { queryKeys } from '../../config/query-keys';
import { QUERY_CONFIG } from '../../config/query-client';
import { RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import { ApiError } from '../../http';

/**
 * Hook to fetch AI predictions
 */
export const useAIPredictions = () => {
    return useQuery({
        queryKey: queryKeys.analytics.smart(),
        queryFn: () => intelligenceApi.getPredictions(),
        staleTime: QUERY_CONFIG.staleTime.analytics,
        retry: RETRY_CONFIG.DEFAULT,
    });
};

/**
 * Hook to fetch anomaly detection results
 * Refetches every minute for real-time monitoring
 */
export const useAnomalyDetection = () => {
    return useQuery({
        queryKey: ['admin', 'intelligence', 'anomalies'],
        queryFn: () => intelligenceApi.getAnomalies(),
        staleTime: 30000, // 30 seconds
        refetchInterval: 60000, // Refresh every minute
        retry: RETRY_CONFIG.DEFAULT,
    });
};

/**
 * Hook to fetch AI insights
 */
export const useAIInsights = () => {
    return useQuery({
        queryKey: ['admin', 'intelligence', 'insights'],
        queryFn: () => intelligenceApi.getInsights(),
        staleTime: QUERY_CONFIG.staleTime.analytics,
        retry: RETRY_CONFIG.DEFAULT,
    });
};

/**
 * Hook to update anomaly status
 */
export const useUpdateAnomalyStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ anomalyId, status }: { anomalyId: string; status: string }) =>
            intelligenceApi.updateAnomalyStatus(anomalyId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'intelligence', 'anomalies'] });
            showSuccessToast('Anomaly status updated successfully');
        },
        onError: (error: ApiError) => {
            handleApiError(error, 'Failed to update anomaly status');
        },
    });
};

/**
 * Hook to fetch demand forecast time-series data
 */
export const useDemandForecast = (days: number = 30) => {
    return useQuery({
        queryKey: ['admin', 'intelligence', 'demand-forecast', days],
        queryFn: () => intelligenceApi.getDemandForecast(days),
        staleTime: QUERY_CONFIG.staleTime.analytics,
        retry: RETRY_CONFIG.DEFAULT,
    });
};
