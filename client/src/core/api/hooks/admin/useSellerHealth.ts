/**
 * Seller Health Hooks
 * Hooks for seller performance monitoring
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sellerHealthApi, HealthFilters } from '../../clients/analytics/sellerHealthApi';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import { ApiError } from '../../http';

/**
 * Hook to fetch seller health metrics
 */
export const useSellerHealth = (filters?: HealthFilters) => {
    return useQuery({
        queryKey: ['admin', 'seller-health', filters],
        queryFn: () => sellerHealthApi.getSellerHealth(filters),
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
    });
};

/**
 * Hook to fetch individual seller health details
 */
export const useSellerHealthDetails = (sellerId: string) => {
    return useQuery({
        queryKey: ['admin', 'seller-health', sellerId],
        queryFn: () => sellerHealthApi.getSellerHealthDetails(sellerId),
        enabled: !!sellerId,
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
    });
};

/**
 * Hook to refresh seller health metrics
 */
export const useRefreshHealthMetrics = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (sellerId: string) => sellerHealthApi.refreshHealthMetrics(sellerId),
        onSuccess: (_, sellerId) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'seller-health'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'seller-health', sellerId] });
            showSuccessToast('Health metrics refreshed successfully');
        },
        onError: (error: ApiError) => {
            handleApiError(error, 'Failed to refresh health metrics');
        },
    });
};
