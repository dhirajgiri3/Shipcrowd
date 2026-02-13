/**
 * RTO Management API Hooks
 *
 * React Query hooks for Return-To-Origin (RTO) event management.
 * Backend: GET/POST/PATCH /api/v1/rto/*
 * Types aligned with server RTOEvent and controller responses.
 */

import {
    useQuery,
    useMutation,
    useQueryClient,
    UseQueryOptions,
    UseMutationOptions,
} from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import type {
    RTOEventDetail,
    RTOListPagination,
    RTOReturnStatus,
    RTOQCResult,
    RTODispositionAction,
} from '@/src/types/api/rto.types';

// Backend list response: { data: events[], pagination }
export interface RTOListResponse {
    data: RTOEventDetail[];
    pagination: RTOListPagination;
}

export interface RTOEventResponse {
    rtoEvents: RTOEventDetail[];
    pagination: RTOListPagination;
}

export interface RTOPendingResponse {
    pending: RTOEventDetail[];
    count: number;
    totalValue: number;
}

export interface RTOFilters {
    returnStatus?: string;
    rtoReason?: string;
    warehouseId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: 'triggeredAt' | 'expectedReturnDate' | 'actualReturnDate';
    sortOrder?: 'asc' | 'desc';
}

export interface PerformQCPayload {
    rtoId: string;
    qcResult: {
        passed: boolean;
        remarks: string;
        images?: string[];
        inspectedBy?: string;
        condition?: string;
        damageTypes?: string[];
        photos?: { url: string; label?: string }[];
    };
}

export interface UpdateRTOStatusPayload {
    rtoId: string;
    returnStatus: RTOReturnStatus;
    notes?: string;
    actualReturnDate?: string;
    reverseAwb?: string;
}

/** Response from GET /rto/events/:id/disposition/suggest */
export interface DispositionSuggestion {
    action: RTODispositionAction;
    reason: string;
    automated: boolean;
}

export interface ExecuteDispositionPayload {
    rtoId: string;
    action: RTODispositionAction;
    notes?: string;
}

/**
 * Get list of RTO events with filters
 * GET /rto/events
 * Backend returns { data: events, pagination }; normalized to { rtoEvents, pagination } for UI.
 */
export function useRTOEvents(filters?: RTOFilters, options?: UseQueryOptions<RTOEventResponse, ApiError>) {
    const params: Record<string, string | number | undefined> = {};
    if (filters?.page != null) params.page = String(filters.page);
    if (filters?.limit != null) params.limit = String(filters.limit);
    if (filters?.returnStatus) params.returnStatus = filters.returnStatus;
    if (filters?.rtoReason) params.rtoReason = filters.rtoReason;
    if (filters?.warehouseId) params.warehouseId = filters.warehouseId;
    if (filters?.startDate) params.startDate = filters.startDate;
    if (filters?.endDate) params.endDate = filters.endDate;
    if (filters?.search) params.search = filters.search;
    if (filters?.sortBy) params.sortBy = filters.sortBy;
    if (filters?.sortOrder) params.sortOrder = filters.sortOrder;

    return useQuery<RTOEventResponse, ApiError>({
        queryKey: queryKeys.rto.events(filters),
        queryFn: async () => {
            const response = await apiClient.get<{ success: boolean; data: RTOListResponse }>(
                '/rto/events',
                { params }
            );
            const payload = response.data?.data ?? response.data;
            const list = (payload as RTOListResponse)?.data;
            const pagination = (payload as RTOListResponse)?.pagination;
            return {
                rtoEvents: Array.isArray(list) ? list : [],
                pagination: pagination ?? {
                    page: 1,
                    limit: 20,
                    total: 0,
                    pages: 0,
                },
            };
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Get single RTO event by ID
 * GET /rto/events/:id
 */
export function useRTODetails(
    rtoId: string | null | undefined,
    options?: UseQueryOptions<RTOEventDetail, ApiError>
) {
    return useQuery<RTOEventDetail, ApiError>({
        queryKey: queryKeys.rto.detail(rtoId ?? ''),
        queryFn: async () => {
            const response = await apiClient.get<{ success: boolean; data: RTOEventDetail | { data: RTOEventDetail } }>(
                `/rto/events/${rtoId}`
            );
            const inner = response.data?.data;
            if (inner && typeof inner === 'object' && 'data' in inner) {
                return inner.data as RTOEventDetail;
            }
            return inner as RTOEventDetail;
        },
        enabled: !!rtoId,
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Get pending RTOs
 * GET /rto/pending
 * Backend returns { data: array }; normalized to { pending, count, totalValue }.
 */
export function useRTOPending(options?: UseQueryOptions<RTOPendingResponse, ApiError>) {
    return useQuery<RTOPendingResponse, ApiError>({
        queryKey: queryKeys.rto.pending(),
        queryFn: async () => {
            const response = await apiClient.get<{ success: boolean; data: RTOEventDetail[] }>(
                '/rto/pending'
            );
            const payload = response.data?.data ?? response.data;
            const pending = Array.isArray(payload) ? payload : [];
            const totalValue = pending.reduce(
                (sum, r) => sum + (typeof (r as RTOEventDetail).rtoCharges === 'number' ? (r as RTOEventDetail).rtoCharges : 0),
                0
            );
            return {
                pending,
                count: pending.length,
                totalValue,
            };
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Upload QC photos for an RTO event
 * POST /rto/events/:id/qc/upload (multipart/form-data, field: photos)
 * Returns { urls: string[] }
 */
export function useUploadRTOQCPhotos(
    options?: UseMutationOptions<{ urls: string[] }, ApiError, { rtoId: string; files: File[] }>
) {
    const queryClient = useQueryClient();

    return useMutation<{ urls: string[] }, ApiError, { rtoId: string; files: File[] }>({
        mutationFn: async ({ rtoId, files }) => {
            const formData = new FormData();
            files.forEach((f) => formData.append('photos', f));
            const response = await apiClient.post<{ success: boolean; data?: { urls: string[] } }>(
                `/rto/events/${rtoId}/qc/upload`,
                formData
            );
            const data = response.data?.data ?? (response.data as unknown as { data?: { urls: string[] } })?.data;
            return data ?? { urls: [] };
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.rto.detail(variables.rtoId) });
            showSuccessToast('Photos uploaded');
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
}

/**
 * Perform QC on RTO
 * POST /rto/events/:id/qc
 * Backend expects body: { qcResult: { passed, remarks, images?, inspectedBy? } }
 */
export function usePerformRTOQC(
    options?: UseMutationOptions<RTOEventDetail, ApiError, PerformQCPayload>
) {
    const queryClient = useQueryClient();

    return useMutation<RTOEventDetail, ApiError, PerformQCPayload>({
        mutationFn: async (payload: PerformQCPayload) => {
            const response = await apiClient.post<{ success: boolean; data?: RTOEventDetail }>(
                `/rto/events/${payload.rtoId}/qc`,
                { qcResult: payload.qcResult }
            );
            const data = response.data?.data ?? (response.data as unknown as { data?: RTOEventDetail })?.data;
            return data as RTOEventDetail;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.rto.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.rto.detail(variables.rtoId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.rto.analytics(), exact: false });
            showSuccessToast('RTO quality check recorded successfully');
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
}

/**
 * Update RTO status (e.g. mark restocked, in_transit, etc.)
 * PATCH /rto/events/:id/status
 */
export function useUpdateRTOStatus(
    options?: UseMutationOptions<unknown, ApiError, UpdateRTOStatusPayload>
) {
    const queryClient = useQueryClient();

    return useMutation<unknown, ApiError, UpdateRTOStatusPayload>({
        mutationFn: async (payload: UpdateRTOStatusPayload) => {
            await apiClient.patch(`/rto/events/${payload.rtoId}/status`, {
                returnStatus: payload.returnStatus,
                notes: payload.notes,
                actualReturnDate: payload.actualReturnDate,
                reverseAwb: payload.reverseAwb,
            });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.rto.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.rto.detail(variables.rtoId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.rto.analytics(), exact: false });
            showSuccessToast('RTO status updated');
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
}

/**
 * Suggest disposition for an RTO (after QC completed)
 * GET /rto/events/:id/disposition/suggest
 */
export function useSuggestDisposition(
    rtoId: string | null | undefined,
    options?: UseQueryOptions<DispositionSuggestion, ApiError>
) {
    return useQuery<DispositionSuggestion, ApiError>({
        queryKey: [...queryKeys.rto.detail(rtoId ?? ''), 'disposition', 'suggest'],
        queryFn: async () => {
            const response = await apiClient.get<{ success: boolean; data: DispositionSuggestion }>(
                `/rto/events/${rtoId}/disposition/suggest`
            );
            return response.data?.data ?? response.data;
        },
        enabled: !!rtoId,
        ...CACHE_TIMES.SHORT,
        retry: false,
        ...options,
    });
}

/**
 * Execute disposition (restock / refurb / dispose / claim)
 * POST /rto/events/:id/disposition/execute
 */
export function useExecuteDisposition(
    options?: UseMutationOptions<RTOEventDetail, ApiError, ExecuteDispositionPayload>
) {
    const queryClient = useQueryClient();

    return useMutation<RTOEventDetail, ApiError, ExecuteDispositionPayload>({
        mutationFn: async (payload: ExecuteDispositionPayload) => {
            const response = await apiClient.post<{ success: boolean; data?: RTOEventDetail }>(
                `/rto/events/${payload.rtoId}/disposition/execute`,
                { action: payload.action, notes: payload.notes }
            );
            const data = response.data?.data;
            return data as RTOEventDetail;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.rto.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.rto.detail(variables.rtoId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.rto.analytics(), exact: false });
            showSuccessToast('Disposition applied');
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
}

/**
 * Trigger RTO for a shipment
 * POST /rto/trigger
 */
export function useTriggerRTO(
    options?: UseMutationOptions<
        { rtoEventId: string; reverseAwb: string },
        ApiError,
        { shipmentId: string; reason: string }
    >
) {
    const queryClient = useQueryClient();

    return useMutation<
        { rtoEventId: string; reverseAwb: string },
        ApiError,
        { shipmentId: string; reason: string }
    >({
        mutationFn: async (payload) => {
            const response = await apiClient.post<{
                success: boolean;
                data?: { rtoEventId: string; reverseAwb: string };
            }>('/rto/trigger', payload);
            const data = response.data?.data ?? (response.data as unknown as { data?: { rtoEventId: string; reverseAwb: string } })?.data;
            return data ?? { rtoEventId: '', reverseAwb: '' };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.rto.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.shipments.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.rto.analytics(), exact: false });
            showSuccessToast('RTO triggered successfully');
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
}
