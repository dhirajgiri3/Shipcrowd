/**
 * NDR (Non-Delivery Report) React Query Hooks
 * 
 * Custom hooks for NDR operations:
 * - Fetch NDR cases with filters
 * - Get individual NDR case details
 * - Take actions on NDR cases
 * - Bulk operations
 * - Analytics and metrics
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient } from '@/src/core/api/client';
import { ApiError } from '@/src/core/api/client';
import { CACHE_TIMES, RETRY_CONFIG } from '@/src/core/api/config/cache.config';
import { queryKeys } from '@/src/core/api/config/query-keys';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import type {
    NDRCase,
    NDRFilters,
    NDRListResponse,
    TakeNDRActionPayload,
    BulkNDRActionPayload,
    NDRMetrics,
    NDRAnalytics,
    NDRSettings,
} from '@/src/types/api/orders';

// ==================== Queries ====================

/**
 * Fetch NDR cases with filters
 */
export function useNDRCases(filters?: NDRFilters, options?: UseQueryOptions<NDRListResponse, ApiError>) {
    return useQuery<NDRListResponse, ApiError>({
        queryKey: queryKeys.ndr.list(filters),
        queryFn: async () => {
            const { data } = await apiClient.get<NDRListResponse>('/api/ndr/cases', {
                params: filters,
            });
            return data;
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Fetch single NDR case by ID
 */
export function useNDRCase(caseId: string, options?: UseQueryOptions<NDRCase, ApiError>) {
    return useQuery<NDRCase, ApiError>({
        queryKey: queryKeys.ndr.detail(caseId),
        queryFn: async () => {
            const { data } = await apiClient.get<NDRCase>(`/api/ndr/cases/${caseId}`);
            return data;
        },
        enabled: !!caseId,
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Fetch NDR metrics
 */
export function useNDRMetrics() {
    return useQuery({
        queryKey: queryKeys.ndr.metrics(),
        queryFn: async () => {
            const { data } = await apiClient.get<NDRMetrics>('/api/ndr/metrics');
            return data;
        },
    });
}

/**
 * Fetch NDR analytics
 */
export function useNDRAnalytics(filters?: { startDate?: string; endDate?: string }) {
    return useQuery({
        queryKey: queryKeys.ndr.analytics(filters),
        queryFn: async () => {
            const { data } = await apiClient.get<NDRAnalytics>('/api/ndr/analytics', {
                params: filters,
            });
            return data;
        },
    });
}

/**
 * Fetch NDR settings
 */
export function useNDRSettings() {
    return useQuery({
        queryKey: queryKeys.ndr.settings(),
        queryFn: async () => {
            const { data } = await apiClient.get<NDRSettings>('/api/ndr/settings');
            return data;
        },
    });
}

// ==================== Mutations ====================

/**
 * Take action on an NDR case
 */
export function useTakeNDRAction() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ caseId, payload }: { caseId: string; payload: TakeNDRActionPayload }) => {
            const { data } = await apiClient.post<NDRCase>(
                `/api/ndr/cases/${caseId}/action`,
                payload
            );
            return data;
        },
        onSuccess: (data) => {
            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: queryKeys.ndr.list() });
            queryClient.invalidateQueries({ queryKey: queryKeys.ndr.detail(data._id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.ndr.metrics() });
        },
    });
}

/**
 * Bulk action on multiple NDR cases
 */
export function useBulkNDRAction() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: BulkNDRActionPayload) => {
            const { data } = await apiClient.post('/api/ndr/cases/bulk-action', payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.ndr.list() });
            queryClient.invalidateQueries({ queryKey: queryKeys.ndr.metrics() });
        },
    });
}

/**
 * Escalate NDR case to admin
 */
export function useEscalateNDR() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ caseId, reason }: { caseId: string; reason: string }) => {
            const { data } = await apiClient.post<NDRCase>(
                `/api/ndr/cases/${caseId}/escalate`,
                { reason }
            );
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.ndr.list() });
            queryClient.invalidateQueries({ queryKey: queryKeys.ndr.detail(data._id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.ndr.metrics() });
        },
    });
}

/**
 * Update NDR settings
 */
export function useUpdateNDRSettings() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (settings: Partial<NDRSettings>) => {
            const { data } = await apiClient.patch<NDRSettings>('/api/ndr/settings', settings);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.ndr.settings() });
        },
    });
}

/**
 * Manually send customer communication
 */
export function useSendNDRCommunication() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            caseId,
            channel,
            template
        }: {
            caseId: string;
            channel: 'sms' | 'email' | 'whatsapp';
            template: string;
        }) => {
            const { data } = await apiClient.post(
                `/api/ndr/cases/${caseId}/communicate`,
                { channel, template }
            );
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.ndr.detail(variables.caseId) });
        },
    });
}
