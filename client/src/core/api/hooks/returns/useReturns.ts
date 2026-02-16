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
    ReviewReturnPayload,
    PerformQCPayload,
    ProcessRefundPayload,
    ReturnMetrics,
    ReturnAnalytics,
} from '@/src/types/api/returns';

export function useReturns(filters?: ReturnFilters, options?: UseQueryOptions<ReturnListResponse, ApiError>) {
    return useQuery<ReturnListResponse, ApiError>({
        queryKey: queryKeys.returns.list(filters),
        queryFn: async () => {
            const params = {
                ...filters,
                returnReason: filters?.returnReason || filters?.reason,
            };
            if (typeof params.search === 'string' && params.search.trim() === '') {
                delete (params as Record<string, unknown>).search;
            }
            const response = await apiClient.get<any>('/logistics/returns', { params });
            const body = response?.data || {};
            const payload = (Array.isArray(body?.data) || body?.pagination)
                ? body
                : (body?.data || body);
            const list = Array.isArray(payload?.data)
                ? payload.data
                : Array.isArray(payload?.returns)
                    ? payload.returns
                    : [];
            const pagination = payload?.pagination || {
                page: filters?.page || 1,
                limit: filters?.limit || 20,
                total: list.length,
                pages: 1,
                totalPages: 1,
            };

            return {
                returns: list,
                pagination: {
                    page: pagination.page || 1,
                    limit: pagination.limit || 20,
                    total: pagination.total || 0,
                    totalPages: pagination.totalPages || pagination.pages || 1,
                },
            };
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
            const response = await apiClient.get<any>(`/logistics/returns/${returnId}`);
            return response?.data?.data || response?.data;
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
            const response = await apiClient.get<any>('/logistics/returns/stats');
            const body = response?.data || {};
            const stats = body?.data || body;
            const summary = stats.summary || stats;
            return {
                total: summary.total || summary.totalReturns || 0,
                requested: summary.requested || 0,
                sellerReviewPending: summary.sellerReviewPending || 0,
                qcPending: summary.qcPending || 0,
                completed: summary.completed || 0,
                totalRefundAmount: summary.totalRefundAmount || 0,
                averageProcessingTimeHours: summary.averageProcessingTimeHours || summary.averageProcessingTime || 0,
                returnRate: summary.returnRate || 0,
                byStatus: stats.byStatus || stats.returnsByStatus || {},
                byReason: stats.byReason || {},
                period: stats.period,
            };
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useReturnAnalytics(filters?: { startDate?: string; endDate?: string }, options?: UseQueryOptions<ReturnAnalytics, ApiError>) {
    return useQuery<ReturnAnalytics, ApiError>({
        queryKey: queryKeys.returns.analytics(filters),
        queryFn: async () => {
            const response = await apiClient.get<any>('/logistics/returns/stats', { params: filters });
            const body = response?.data || {};
            const data = body?.data || body;
            return {
                summary: data.summary || {},
                byStatus: data.byStatus || {},
                byReason: data.byReason || {},
                topReasons: data.topReasons || [],
                period: data.period || {},
            } as ReturnAnalytics;
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
            const response = await apiClient.post<any>('/logistics/returns', payload);
            return response?.data?.data || response?.data;
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

export function useReviewReturn(options?: UseMutationOptions<ReturnRequest, ApiError, { returnId: string; payload: ReviewReturnPayload }>) {
    const queryClient = useQueryClient();
    return useMutation<ReturnRequest, ApiError, { returnId: string; payload: ReviewReturnPayload }>({
        mutationFn: async ({ returnId, payload }) => {
            const response = await apiClient.patch<any>(`/logistics/returns/${returnId}/review`, payload);
            return response?.data?.data || response?.data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.returns.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.returns.detail(variables.returnId) });
            showSuccessToast('Return review submitted successfully');
        },
        onError: (error) => handleApiError(error, 'Return Review Failed'),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function usePerformQC(options?: UseMutationOptions<ReturnRequest, ApiError, { returnId: string; payload: PerformQCPayload }>) {
    const queryClient = useQueryClient();
    return useMutation<ReturnRequest, ApiError, { returnId: string; payload: PerformQCPayload }>({
        mutationFn: async ({ returnId, payload }) => {
            const response = await apiClient.post<any>(`/logistics/returns/${returnId}/qc`, payload);
            return response?.data?.data || response?.data;
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
            const response = await apiClient.post<any>(`/logistics/returns/${returnId}/refund`, payload);
            return response?.data?.data || response?.data;
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
            const response = await apiClient.post<any>(`/logistics/returns/${returnId}/cancel`);
            return response?.data?.data || response?.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.returns.all() });
            if (data?._id) {
                queryClient.removeQueries({ queryKey: queryKeys.returns.detail(data._id) });
            }
            showSuccessToast('Return cancelled successfully');
        },
        onError: (error) => handleApiError(error, 'Cancel Return Failed'),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

// legacy alias to avoid breaking old imports while migrating callers
export const useApproveReturn = useReviewReturn;
