/**
 * Admin Disputes Hooks
 * Centralized hooks for managing weight disputes in the admin panel
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/src/core/api/http';
import { queryKeys } from '@/src/core/api/config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '@/src/core/api/config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import {
    WeightDispute,
    DisputeFilters,
    DisputeListResponse,
    DisputeMetrics,
    DisputeAnalytics,
    ResolveDisputePayload
} from '@/src/types/api/returns';

// Re-export types for convenience
export type { WeightDispute, DisputeFilters, DisputeMetrics, DisputeAnalytics };

/**
 * Get paginated list of weight disputes (Admin View)
 */
export const useAdminDisputes = (filters?: DisputeFilters) => {
    return useQuery<DisputeListResponse, ApiError>({
        queryKey: queryKeys.disputes.list(filters),
        queryFn: async () => {
            // Admin endpoint might be same, ensuring we use the correct params
            const params = new URLSearchParams();
            if (filters?.status) params.append('status', filters.status);
            if (filters?.startDate) params.append('startDate', filters.startDate);
            if (filters?.endDate) params.append('endDate', filters.endDate);
            if (filters?.search) params.append('search', filters.search);
            if (filters?.page) params.append('page', filters.page.toString());
            if (filters?.limit) params.append('limit', filters.limit.toString());

            // Using the existing endpoint which seems to handle admin/seller based on context or it's a shared endpoint
            const response = await apiClient.get(`/disputes/weight?${params.toString()}`);
            return response.data.data;
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
    });
};

/**
 * Get dispute metrics for dashboard
 */
export const useAdminDisputeMetrics = (dateRange?: { startDate?: string; endDate?: string }) => {
    return useQuery<DisputeMetrics, ApiError>({
        queryKey: queryKeys.disputes.metrics(dateRange as any),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
            if (dateRange?.endDate) params.append('endDate', dateRange.endDate);

            const response = await apiClient.get(`/disputes/weight/metrics?${params.toString()}`);
            return response.data.data.metrics;
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
    });
};

/**
 * Get comprehensive analytics
 */
export const useAdminDisputeAnalytics = (filters?: any) => {
    return useQuery<DisputeAnalytics, ApiError>({
        queryKey: queryKeys.disputes.analytics(filters),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters?.startDate) params.append('startDate', filters.startDate);
            if (filters?.endDate) params.append('endDate', filters.endDate);
            if (filters?.groupBy) params.append('groupBy', filters.groupBy);

            const response = await apiClient.get(`/disputes/weight/analytics?${params.toString()}`);
            return response.data.data;
        },
        ...CACHE_TIMES.LONG,
        retry: RETRY_CONFIG.DEFAULT,
    });
};

/**
 * Resolve dispute
 */
export const useAdminResolveDispute = () => {
    const queryClient = useQueryClient();
    return useMutation<WeightDispute, ApiError, { disputeId: string; resolution: ResolveDisputePayload }>({
        mutationFn: async ({ disputeId, resolution }) => {
            const response = await apiClient.post(
                `/disputes/weight/${disputeId}/resolve`,
                resolution
            );
            return response.data.data.dispute;
        },
        onSuccess: (data, variables) => {
            showSuccessToast('Dispute resolved successfully');
            queryClient.invalidateQueries({ queryKey: queryKeys.disputes.all() });
        },
        onError: (error) => handleApiError(error, 'Failed to resolve dispute'),
    });
};

/**
 * Batch operations on multiple disputes (admin-only)
 */
export const useAdminBatchDisputes = () => {
    const queryClient = useQueryClient();

    return useMutation<
        { success: number; failed: number },
        ApiError,
        { disputeIds: string[]; action: 'approve_seller' | 'approve_carrier' | 'request_evidence' | 'escalate' | 'waive'; notes?: string }
    >({
        mutationFn: async ({ disputeIds, action, notes }) => {
            const response = await apiClient.post('/disputes/weight/batch', {
                disputeIds,
                action,
                notes,
            });
            return response.data.data;
        },
        onSuccess: (data) => {
            showSuccessToast(`Batch operation completed: ${data.success} succeeded, ${data.failed} failed`);
            queryClient.invalidateQueries({ queryKey: queryKeys.disputes.all() });
        },
        onError: (error) => handleApiError(error, 'Failed to perform batch dispute operation'),
    });
};
