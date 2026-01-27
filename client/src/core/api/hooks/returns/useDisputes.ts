/**
 * Weight Dispute API Hooks
 * 
 * React Query hooks for weight dispute management:
 * - Query: List, details, metrics, analytics
 * - Mutations: Submit evidence, resolve dispute
 * 
 * Backend endpoints:
 * - GET    /api/v1/disputes/weight
 * - GET    /api/v1/disputes/weight/:id
 * - GET    /api/v1/disputes/weight/metrics
 * - GET    /api/v1/disputes/weight/analytics
 * - POST   /api/v1/disputes/weight/:id/submit
 * - POST   /api/v1/disputes/weight/:id/resolve
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient } from '../../http';
import { ApiError } from '../../http';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { queryKeys } from '../../config/query-keys';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import type {
    WeightDispute,
    DisputeFilters,
    DisputeListResponse,
    SubmitEvidencePayload,
    ResolveDisputePayload,
    DisputeMetrics,
    DisputeAnalytics,
} from '@/src/types/api/returns';

// Analytics filter type extending base filters
interface DisputeAnalyticsFilters {
    startDate?: string;
    endDate?: string;
    companyId?: string;
    groupBy?: 'day' | 'week' | 'month';
}

// ==================== QUERY HOOKS ====================

/**
 * Get paginated list of weight disputes with filters
 */
export function useWeightDisputes(
    filters?: DisputeFilters,
    options?: UseQueryOptions<DisputeListResponse, ApiError>
): UseQueryResult<DisputeListResponse, ApiError> {
    return useQuery<DisputeListResponse, ApiError>({
        queryKey: queryKeys.disputes.list(filters),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters?.status) params.append('status', filters.status);
            if (filters?.startDate) params.append('startDate', filters.startDate);
            if (filters?.endDate) params.append('endDate', filters.endDate);
            if (filters?.search) params.append('search', filters.search);
            if (filters?.page) params.append('page', filters.page.toString());
            if (filters?.limit) params.append('limit', filters.limit.toString());

            const response = await apiClient.get(`/disputes/weight?${params.toString()}`);
            return response.data.data;
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Get single dispute details with full timeline
 */
export function useWeightDispute(
    disputeId: string,
    options?: UseQueryOptions<WeightDispute, ApiError>
): UseQueryResult<WeightDispute, ApiError> {
    return useQuery<WeightDispute, ApiError>({
        queryKey: queryKeys.disputes.detail(disputeId),
        queryFn: async () => {
            const response = await apiClient.get(`/disputes/weight/${disputeId}`);
            return response.data.data.dispute;
        },
        enabled: !!disputeId,
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Get dispute metrics for dashboard
 */
export function useDisputeMetrics(
    dateRange?: { startDate?: string; endDate?: string },
    options?: UseQueryOptions<DisputeMetrics, ApiError>
): UseQueryResult<DisputeMetrics, ApiError> {
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
        ...options,
    });
}

/**
 * Get comprehensive analytics (admin only)
 */
export function useDisputeAnalytics(
    filters?: DisputeAnalyticsFilters,
    options?: UseQueryOptions<DisputeAnalytics, ApiError>
): UseQueryResult<DisputeAnalytics, ApiError> {
    return useQuery<DisputeAnalytics, ApiError>({
        queryKey: queryKeys.disputes.analytics(filters as any),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters?.startDate) params.append('startDate', filters.startDate);
            if (filters?.endDate) params.append('endDate', filters.endDate);
            if (filters?.companyId) params.append('companyId', filters.companyId);
            if (filters?.groupBy) params.append('groupBy', filters.groupBy);

            const response = await apiClient.get(`/disputes/weight/analytics?${params.toString()}`);
            return response.data.data;
        },
        ...CACHE_TIMES.LONG,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

// ==================== MUTATION HOOKS ====================

/**
 * Submit seller evidence for dispute
 */
export function useSubmitEvidence(
    options?: UseMutationOptions<WeightDispute, ApiError, { disputeId: string; evidence: SubmitEvidencePayload }>
): UseMutationResult<WeightDispute, ApiError, { disputeId: string; evidence: SubmitEvidencePayload }> {
    const queryClient = useQueryClient();

    return useMutation<WeightDispute, ApiError, { disputeId: string; evidence: SubmitEvidencePayload }>({
        mutationFn: async ({ disputeId, evidence }) => {
            const response = await apiClient.post(
                `/disputes/weight/${disputeId}/submit`,
                evidence
            );
            return response.data.data.dispute;
        },
        onSuccess: (data, variables) => {
            showSuccessToast('Evidence submitted successfully');
            queryClient.invalidateQueries({ queryKey: queryKeys.disputes.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.disputes.detail(variables.disputeId) });
        },
        onError: (error) => {
            handleApiError(error);
        },
        ...options,
    });
}

/**
 * Resolve dispute (admin only)
 */
export function useResolveDispute(
    options?: UseMutationOptions<WeightDispute, ApiError, { disputeId: string; resolution: ResolveDisputePayload }>
): UseMutationResult<WeightDispute, ApiError, { disputeId: string; resolution: ResolveDisputePayload }> {
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
            queryClient.invalidateQueries({ queryKey: queryKeys.disputes.detail(variables.disputeId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.disputes.metrics(undefined) });
            queryClient.invalidateQueries({ queryKey: queryKeys.disputes.analytics(undefined) });
        },
        onError: (error) => {
            handleApiError(error);
        },
        ...options,
    });
}
