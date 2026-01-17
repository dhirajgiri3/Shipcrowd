/**
 * COD Remittance API Hooks
 * 
 * React Query hooks for COD remittance operations.
 * Endpoints from: /server/src/presentation/http/controllers/finance/cod-remittance.controller.ts
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '../config/client';
import { queryKeys } from '../config/queryKeys';
import type {
    CODRemittance,
    CODRemittanceResponse,
    CODStats,
    EligibleShipmentsResponse,
    RemittanceFilters,
    CreateBatchPayload,
    ApproveRemittancePayload,
    RequestPayoutPayload,
} from '@/src/types/api/cod.types';

// ==================== Query Hooks ====================

/**
 * Get list of COD remittances with filters
 * GET /finance/cod-remittance
 */
export function useCODRemittances(filters?: RemittanceFilters): UseQueryResult<CODRemittanceResponse> {
    return useQuery({
        queryKey: queryKeys.cod.remittances(filters),
        queryFn: async () => {
            const response = await apiClient.get<CODRemittanceResponse>('/finance/cod-remittance', {
                params: filters,
            });
            return response.data;
        },
        staleTime: 30 * 1000, // 30 seconds
    });
}

/**
 * Get single remittance details
 * GET /finance/cod-remittance/:id
 */
export function useCODRemittance(id: string): UseQueryResult<CODRemittance> {
    return useQuery({
        queryKey: queryKeys.cod.remittance(id),
        queryFn: async () => {
            const response = await apiClient.get<{ remittance: CODRemittance }>(`/finance/cod-remittance/${id}`);
            return response.data.remittance;
        },
        enabled: !!id,
    });
}

/**
 * Get COD dashboard statistics
 * GET /finance/cod-remittance/dashboard
 */
export function useCODStats(): UseQueryResult<CODStats> {
    return useQuery({
        queryKey: queryKeys.cod.analytics(),
        queryFn: async () => {
            const response = await apiClient.get<CODStats>('/finance/cod-remittance/dashboard');
            return response.data;
        },
        staleTime: 60 * 1000, // 1 minute
    });
}

/**
 * Get eligible shipments for creating remittance batch
 * GET /finance/cod-remittance/eligible-shipments
 */
export function useEligibleShipments(cutoffDate?: string): UseQueryResult<EligibleShipmentsResponse> {
    return useQuery({
        queryKey: ['cod', 'eligible-shipments', cutoffDate],
        queryFn: async () => {
            const response = await apiClient.get<EligibleShipmentsResponse>('/finance/cod-remittance/eligible-shipments', {
                params: { cutoffDate },
            });
            return response.data;
        },
        enabled: !!cutoffDate,
    });
}

// ==================== Mutation Hooks ====================

/**
 * Create new remittance batch
 * POST /finance/cod-remittance/create
 */
export function useCreateRemittanceBatch(): UseMutationResult<any, Error, CreateBatchPayload> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateBatchPayload) => {
            const response = await apiClient.post('/finance/cod-remittance/create', payload);
            return response.data;
        },
        onSuccess: () => {
            // Invalidate remittance list and stats
            queryClient.invalidateQueries({ queryKey: ['cod'] });
        },
    });
}

/**
 * Approve remittance batch (Admin)
 * POST /finance/cod-remittance/:id/approve
 */
export function useApproveRemittance(id: string): UseMutationResult<any, Error, ApproveRemittancePayload> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: ApproveRemittancePayload) => {
            const response = await apiClient.post(`/finance/cod-remittance/${id}/approve`, payload);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.cod.remittance(id) });
            queryClient.invalidateQueries({ queryKey: ['cod'] });
        },
    });
}

/**
 * Initiate payout for approved remittance (Admin)
 * POST /finance/cod-remittance/:id/initiate-payout
 */
export function useInitiatePayout(id: string): UseMutationResult<any, Error, void> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const response = await apiClient.post(`/finance/cod-remittance/${id}/initiate-payout`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.cod.remittance(id) });
            queryClient.invalidateQueries({ queryKey: ['cod'] });
        },
    });
}

/**
 * Cancel remittance batch
 * POST /finance/cod-remittance/:id/cancel
 */
export function useCancelRemittance(id: string): UseMutationResult<any, Error, { reason: string }> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: { reason: string }) => {
            const response = await apiClient.post(`/finance/cod-remittance/${id}/cancel`, payload);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.cod.remittance(id) });
            queryClient.invalidateQueries({ queryKey: ['cod'] });
        },
    });
}

/**
 * Request on-demand payout
 * POST /finance/cod-remittance/request-payout
 */
export function useRequestPayout(): UseMutationResult<any, Error, RequestPayoutPayload> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: RequestPayoutPayload) => {
            const response = await apiClient.post('/finance/cod-remittance/request-payout', payload);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cod'] });
        },
    });
}
