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

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '../client';
import { queryKeys } from '../queryKeys';
import type {
    WeightDispute,
    DisputeFilters,
    DisputeListResponse,
    SubmitEvidencePayload,
    ResolveDisputePayload,
    DisputeMetrics,
    DisputeAnalytics,
} from '@/src/types/api/dispute.types';

// ==================== QUERY HOOKS ====================

/**
 * Get paginated list of weight disputes with filters
 */
export function useWeightDisputes(
    filters?: DisputeFilters
): UseQueryResult<DisputeListResponse> {
    return useQuery({
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
        staleTime: 30000, // 30 seconds
    });
}

/**
 * Get single dispute details with full timeline
 */
export function useWeightDispute(
    disputeId: string
): UseQueryResult<WeightDispute> {
    return useQuery({
        queryKey: queryKeys.disputes.detail(disputeId),
        queryFn: async () => {
            const response = await apiClient.get(`/disputes/weight/${disputeId}`);
            return response.data.data.dispute;
        },
        enabled: !!disputeId,
        staleTime: 60000, // 1 minute
    });
}

/**
 * Get dispute metrics for dashboard
 */
export function useDisputeMetrics(
    dateRange?: { startDate?: string; endDate?: string }
): UseQueryResult<DisputeMetrics> {
    return useQuery({
        queryKey: queryKeys.disputes.metrics(dateRange),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
            if (dateRange?.endDate) params.append('endDate', dateRange.endDate);

            const response = await apiClient.get(`/disputes/weight/metrics?${params.toString()}`);
            return response.data.data.metrics;
        },
        staleTime: 60000, // 1 minute
    });
}

/**
 * Get comprehensive analytics (admin only)
 */
export function useDisputeAnalytics(
    filters?: {
        startDate?: string;
        endDate?: string;
        companyId?: string;
        groupBy?: 'day' | 'week' | 'month';
    }
): UseQueryResult<DisputeAnalytics> {
    return useQuery({
        queryKey: queryKeys.disputes.analytics(filters),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters?.startDate) params.append('startDate', filters.startDate);
            if (filters?.endDate) params.append('endDate', filters.endDate);
            if (filters?.companyId) params.append('companyId', filters.companyId);
            if (filters?.groupBy) params.append('groupBy', filters.groupBy);

            const response = await apiClient.get(`/disputes/weight/analytics?${params.toString()}`);
            return response.data.data;
        },
        staleTime: 300000, // 5 minutes
    });
}

// ==================== MUTATION HOOKS ====================

/**
 * Submit seller evidence for dispute
 */
export function useSubmitEvidence(): UseMutationResult<
    WeightDispute,
    Error,
    { disputeId: string; evidence: SubmitEvidencePayload }
> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ disputeId, evidence }) => {
            const response = await apiClient.post(
                `/disputes/weight/${disputeId}/submit`,
                evidence
            );
            return response.data.data.dispute;
        },
        onSuccess: (data, variables) => {
            // Invalidate and refetch
            queryClient.invalidateQueries({ queryKey: queryKeys.disputes.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.disputes.detail(variables.disputeId) });
        },
    });
}

/**
 * Resolve dispute (admin only)
 */
export function useResolveDispute(): UseMutationResult<
    WeightDispute,
    Error,
    { disputeId: string; resolution: ResolveDisputePayload }
> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ disputeId, resolution }) => {
            const response = await apiClient.post(
                `/disputes/weight/${disputeId}/resolve`,
                resolution
            );
            return response.data.data.dispute;
        },
        onSuccess: (data, variables) => {
            // Invalidate all dispute-related queries
            queryClient.invalidateQueries({ queryKey: queryKeys.disputes.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.disputes.detail(variables.disputeId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.disputes.metrics() });
            queryClient.invalidateQueries({ queryKey: queryKeys.disputes.analytics() });
        },
    });
}
