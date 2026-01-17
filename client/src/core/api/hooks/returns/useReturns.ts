/**
 * Returns Management React Query Hooks
 * 
 * Hooks for reverse logistics operations:
 * - Fetch return requests
 * - Create/approve/reject returns
 * - QC workflow
 * - Refund processing
 * - Analytics
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/src/core/api/config/client';
import { queryKeys } from '@/src/core/api/config/queryKeys';
import type {
    ReturnRequest,
    ReturnFilters,
    ReturnListResponse,
    CreateReturnPayload,
    ApproveReturnPayload,
    PerformQCPayload,
    ProcessRefundPayload,
    ReturnMetrics,
    ReturnAnalytics,
} from '@/src/types/api/returns';

// ==================== Queries ====================

/**
 * Fetch return requests with filters
 */
export function useReturns(filters?: ReturnFilters) {
    return useQuery({
        queryKey: queryKeys.returns.list(filters),
        queryFn: async () => {
            const { data } = await apiClient.get<ReturnListResponse>('/api/returns', {
                params: filters,
            });
            return data;
        },
    });
}

/**
 * Fetch single return request by ID
 */
export function useReturn(returnId: string) {
    return useQuery({
        queryKey: queryKeys.returns.detail(returnId),
        queryFn: async () => {
            const { data } = await apiClient.get<ReturnRequest>(`/api/returns/${returnId}`);
            return data;
        },
        enabled: !!returnId,
    });
}

/**
 * Fetch return metrics
 */
export function useReturnMetrics() {
    return useQuery({
        queryKey: queryKeys.returns.analytics(),
        queryFn: async () => {
            const { data } = await apiClient.get<ReturnMetrics>('/api/returns/metrics');
            return data;
        },
    });
}

/**
 * Fetch return analytics
 */
export function useReturnAnalytics(filters?: { startDate?: string; endDate?: string }) {
    return useQuery({
        queryKey: queryKeys.returns.analytics(filters?.startDate),
        queryFn: async () => {
            const { data } = await apiClient.get<ReturnAnalytics>('/api/returns/analytics', {
                params: filters,
            });
            return data;
        },
    });
}

// ==================== Mutations ====================

/**
 * Create new return request
 */
export function useCreateReturn() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateReturnPayload) => {
            const { data } = await apiClient.post<ReturnRequest>('/api/returns', payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.returns.list() });
            queryClient.invalidateQueries({ queryKey: queryKeys.returns.analytics() });
        },
    });
}

/**
 * Approve or reject return request
 */
export function useApproveReturn() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ returnId, payload }: { returnId: string; payload: ApproveReturnPayload }) => {
            const { data } = await apiClient.post<ReturnRequest>(
                `/api/returns/${returnId}/approve`,
                payload
            );
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.returns.list() });
            queryClient.invalidateQueries({ queryKey: queryKeys.returns.detail(data._id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.returns.analytics() });
        },
    });
}

/**
 * Perform quality check
 */
export function usePerformQC() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ returnId, payload }: { returnId: string; payload: PerformQCPayload }) => {
            const { data } = await apiClient.post<ReturnRequest>(
                `/api/returns/${returnId}/qc`,
                payload
            );
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.returns.list() });
            queryClient.invalidateQueries({ queryKey: queryKeys.returns.detail(data._id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.returns.analytics() });
        },
    });
}

/**
 * Process refund
 */
export function useProcessRefund() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ returnId, payload }: { returnId: string; payload: ProcessRefundPayload }) => {
            const { data } = await apiClient.post<ReturnRequest>(
                `/api/returns/${returnId}/refund`,
                payload
            );
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.returns.list() });
            queryClient.invalidateQueries({ queryKey: queryKeys.returns.detail(data._id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.returns.analytics() });
        },
    });
}

/**
 * Cancel return request
 */
export function useCancelReturn() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (returnId: string) => {
            const { data } = await apiClient.post<ReturnRequest>(`/api/returns/${returnId}/cancel`);
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.returns.list() });
            queryClient.invalidateQueries({ queryKey: queryKeys.returns.detail(data._id) });
        },
    });
}
