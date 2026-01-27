/**
 * COD Remittance API Hooks
 * React Query hooks for COD remittance operations.
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import type {
    CODRemittance,
    CODRemittanceResponse,
    CODStats,
    EligibleShipmentsResponse,
    RemittanceFilters,
    CreateBatchPayload,
    ApproveRemittancePayload,
    RequestPayoutPayload,
} from '@/src/types/api/finance';

export function useCODRemittances(filters?: RemittanceFilters, options?: UseQueryOptions<CODRemittanceResponse, ApiError>): UseQueryResult<CODRemittanceResponse, ApiError> {
    return useQuery<CODRemittanceResponse, ApiError>({
        queryKey: queryKeys.cod.remittances(filters),
        queryFn: async () => {
            const response = await apiClient.get<CODRemittanceResponse>('/finance/cod-remittance', { params: filters });
            return response.data;
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useCODRemittance(id: string, options?: UseQueryOptions<CODRemittance, ApiError>): UseQueryResult<CODRemittance, ApiError> {
    return useQuery<CODRemittance, ApiError>({
        queryKey: queryKeys.cod.remittance(id),
        queryFn: async () => {
            const response = await apiClient.get<{ remittance: CODRemittance }>(`/finance/cod-remittance/${id}`);
            return response.data.remittance;
        },
        enabled: !!id,
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useCODStats(options?: UseQueryOptions<CODStats, ApiError>): UseQueryResult<CODStats, ApiError> {
    return useQuery<CODStats, ApiError>({
        queryKey: queryKeys.cod.analytics(),
        queryFn: async () => {
            const response = await apiClient.get<CODStats>('/finance/cod-remittance/dashboard');
            return response.data;
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useEligibleCODShipments(cutoffDate?: string, options?: UseQueryOptions<EligibleShipmentsResponse, ApiError>): UseQueryResult<EligibleShipmentsResponse, ApiError> {
    return useQuery<EligibleShipmentsResponse, ApiError>({
        queryKey: queryKeys.cod.eligible(cutoffDate),
        queryFn: async () => {
            const response = await apiClient.get<EligibleShipmentsResponse>('/finance/cod-remittance/eligible-shipments', { params: { cutoffDate } });
            return response.data;
        },
        enabled: !!cutoffDate,
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useCreateRemittanceBatch(options?: UseMutationOptions<any, ApiError, CreateBatchPayload>): UseMutationResult<any, ApiError, CreateBatchPayload> {
    const queryClient = useQueryClient();
    return useMutation<any, ApiError, CreateBatchPayload>({
        mutationFn: async (payload: CreateBatchPayload) => {
            const response = await apiClient.post('/finance/cod-remittance/create', payload);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.cod.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() });
            showSuccessToast('Remittance batch created successfully');
        },
        onError: (error) => handleApiError(error, 'Create Batch Failed'),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useApproveRemittance(id: string, options?: UseMutationOptions<any, ApiError, ApproveRemittancePayload>): UseMutationResult<any, ApiError, ApproveRemittancePayload> {
    const queryClient = useQueryClient();
    return useMutation<any, ApiError, ApproveRemittancePayload>({
        mutationFn: async (payload: ApproveRemittancePayload) => {
            const response = await apiClient.post(`/finance/cod-remittance/${id}/approve`, payload);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.cod.all() });
            showSuccessToast('Remittance approved successfully');
        },
        onError: (error) => handleApiError(error, 'Approve Remittance Failed'),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useInitiatePayout(id: string, options?: UseMutationOptions<any, ApiError, void>): UseMutationResult<any, ApiError, void> {
    const queryClient = useQueryClient();
    return useMutation<any, ApiError, void>({
        mutationFn: async () => {
            const response = await apiClient.post(`/finance/cod-remittance/${id}/initiate-payout`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.cod.all() });
            showSuccessToast('Payout initiated successfully');
        },
        onError: (error) => handleApiError(error, 'Initiate Payout Failed'),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useCancelRemittance(id: string, options?: UseMutationOptions<any, ApiError, { reason: string }>): UseMutationResult<any, ApiError, { reason: string }> {
    const queryClient = useQueryClient();
    return useMutation<any, ApiError, { reason: string }>({
        mutationFn: async (payload: { reason: string }) => {
            const response = await apiClient.post(`/finance/cod-remittance/${id}/cancel`, payload);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.cod.all() });
            queryClient.removeQueries({ queryKey: queryKeys.cod.remittance(id) });
            showSuccessToast('Remittance cancelled successfully');
        },
        onError: (error) => handleApiError(error, 'Cancel Remittance Failed'),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useRequestPayout(options?: UseMutationOptions<any, ApiError, RequestPayoutPayload>): UseMutationResult<any, ApiError, RequestPayoutPayload> {
    const queryClient = useQueryClient();
    return useMutation<any, ApiError, RequestPayoutPayload>({
        mutationFn: async (payload: RequestPayoutPayload) => {
            const response = await apiClient.post('/finance/cod-remittance/request-payout', payload);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.cod.all() });
            showSuccessToast('Payout request submitted successfully');
        },
        onError: (error) => handleApiError(error, 'Request Payout Failed'),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}
