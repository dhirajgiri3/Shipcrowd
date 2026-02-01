/**
 * Returns Management React Query Hooks
 * Hooks for reverse logistics operations
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/src/core/api/http';
import { queryKeys } from '@/src/core/api/config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '@/src/core/api/config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
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

export function useReturns(filters?: ReturnFilters, options?: UseQueryOptions<ReturnListResponse, ApiError>) {
    return useQuery<ReturnListResponse, ApiError>({
        queryKey: queryKeys.returns.list(filters),
        queryFn: async () => {
            const { data } = await apiClient.get<ReturnListResponse>('/returns', { params: filters });
            return data;
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useReturn(returnId: string, options?: UseQueryOptions<ReturnRequest, ApiError>) {
    return useQuery<ReturnRequest, ApiError>({
        queryKey: queryKeys.returns.detail(returnId),
        queryFn: async () => {
            const { data } = await apiClient.get<ReturnRequest>(`/returns/${returnId}`);
            return data;
        },
        enabled: !!returnId,
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useReturnMetrics(options?: UseQueryOptions<ReturnMetrics, ApiError>) {
    return useQuery<ReturnMetrics, ApiError>({
        queryKey: queryKeys.returns.analytics(),
        queryFn: async () => {
            const { data } = await apiClient.get<ReturnMetrics>('/returns/stats');
            return data;
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useReturnAnalytics(filters?: { startDate?: string; endDate?: string }, options?: UseQueryOptions<ReturnAnalytics, ApiError>) {
    return useQuery<ReturnAnalytics, ApiError>({
        queryKey: queryKeys.returns.analytics(filters?.startDate),
        queryFn: async () => {
            const { data } = await apiClient.get<ReturnAnalytics>('/returns/stats', { params: filters });
            return data;
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useCreateReturn(options?: UseMutationOptions<ReturnRequest, ApiError, CreateReturnPayload>) {
    const queryClient = useQueryClient();
    return useMutation<ReturnRequest, ApiError, CreateReturnPayload>({
        mutationFn: async (payload: CreateReturnPayload) => {
            const { data } = await apiClient.post<ReturnRequest>('/returns', payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.returns.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() });
            showSuccessToast('Return initiated successfully');
        },
        onError: (error) => handleApiError(error, 'Create Return Failed'),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useApproveReturn(options?: UseMutationOptions<ReturnRequest, ApiError, { returnId: string; payload: ApproveReturnPayload }>) {
    const queryClient = useQueryClient();
    return useMutation<ReturnRequest, ApiError, { returnId: string; payload: ApproveReturnPayload }>({
        mutationFn: async ({ returnId, payload }) => {
            const { data } = await apiClient.post<ReturnRequest>(`/returns/${returnId}/approve`, payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.returns.all() });
            showSuccessToast('Return approved successfully');
        },
        onError: (error) => handleApiError(error, 'Approve Return Failed'),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function usePerformQC(options?: UseMutationOptions<ReturnRequest, ApiError, { returnId: string; payload: PerformQCPayload }>) {
    const queryClient = useQueryClient();
    return useMutation<ReturnRequest, ApiError, { returnId: string; payload: PerformQCPayload }>({
        mutationFn: async ({ returnId, payload }) => {
            const { data } = await apiClient.post<ReturnRequest>(`/returns/${returnId}/qc`, payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.returns.all() });
            showSuccessToast('QC completed successfully');
        },
        onError: (error) => handleApiError(error, 'QC Failed'),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useProcessRefund(options?: UseMutationOptions<ReturnRequest, ApiError, { returnId: string; payload: ProcessRefundPayload }>) {
    const queryClient = useQueryClient();
    return useMutation<ReturnRequest, ApiError, { returnId: string; payload: ProcessRefundPayload }>({
        mutationFn: async ({ returnId, payload }) => {
            const { data } = await apiClient.post<ReturnRequest>(`/returns/${returnId}/refund`, payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.returns.all() });
            showSuccessToast('Refund processed successfully');
        },
        onError: (error) => handleApiError(error, 'Process Refund Failed'),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useCancelReturn(options?: UseMutationOptions<ReturnRequest, ApiError, string>) {
    const queryClient = useQueryClient();
    return useMutation<ReturnRequest, ApiError, string>({
        mutationFn: async (returnId: string) => {
            const { data } = await apiClient.post<ReturnRequest>(`/returns/${returnId}/cancel`);
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.returns.all() });
            queryClient.removeQueries({ queryKey: queryKeys.returns.detail(data._id) });
            showSuccessToast('Return cancelled successfully');
        },
        onError: (error) => handleApiError(error, 'Cancel Return Failed'),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}
