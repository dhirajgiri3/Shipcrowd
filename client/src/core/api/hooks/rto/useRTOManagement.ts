/**
 * RTO Management API Hooks
 *
 * React Query hooks for Return-To-Origin (RTO) event management
 * Backend: GET/POST /api/v1/rto/*
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

export interface RTOEvent {
    _id: string;
    rtoId: string;
    shipmentId: string;
    trackingNumber: string;
    orderId: string;
    orderNumber: string;

    // Customer info
    customerName: string;
    customerPhone: string;
    customerEmail?: string;

    // RTO details
    status: 'initiated' | 'in_transit' | 'received' | 'qc_pending' | 'qc_passed' | 'qc_failed' | 'resolved' | 'closed';
    reason: string;
    initiatedAt: string;
    estimatedDelivery?: string;

    // QC Details
    qualityCheck?: {
        performedBy: string;
        performedAt: string;
        status: 'pass' | 'fail' | 'partial';
        notes: string;
        images?: string[];
    };

    // Metadata
    courier: string;
    weight: number;
    value: number;
    createdAt: string;
    updatedAt: string;
}

export interface RTOEventResponse {
    rtoEvents: RTOEvent[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

export interface RTOPendingResponse {
    pending: RTOEvent[];
    count: number;
    totalValue: number;
}

export interface RTOAnalyticsStats {
    totalRTO: number;
    inTransit: number;
    received: number;
    resolved: number;
    pendingQC: number;
    avgResolutionTime: number;
    estimatedValue: number;
}

export interface RTOFilters {
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}

export interface PerformQCPayload {
    rtoId: string;
    status: 'pass' | 'fail' | 'partial';
    notes: string;
    images?: string[];
}

export interface ResolveRTOPayload {
    rtoId: string;
    resolution: string;
    refundAmount?: number;
}

/**
 * Get list of RTO events with filters
 * GET /rto/events
 */
export const useRTOEvents = (filters?: RTOFilters, options?: UseQueryOptions<RTOEventResponse, ApiError>) => {
    return useQuery<RTOEventResponse, ApiError>({
        queryKey: queryKeys.rto.events(filters),
        queryFn: async () => {
            const response = await apiClient.get<{ data: RTOEventResponse }>(
                '/rto/events',
                { params: filters }
            );
            return response.data.data;
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Get pending RTOs
 * GET /rto/pending
 */
export const useRTOPending = (options?: UseQueryOptions<RTOPendingResponse, ApiError>) => {
    return useQuery<RTOPendingResponse, ApiError>({
        queryKey: queryKeys.rto.pending(),
        queryFn: async () => {
            const response = await apiClient.get<{ data: RTOPendingResponse }>(
                '/rto/pending'
            );
            return response.data.data;
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Get RTO analytics statistics
 * GET /rto/analytics/stats
 */
export const useRTOAnalytics = (options?: UseQueryOptions<RTOAnalyticsStats, ApiError>) => {
    return useQuery<RTOAnalyticsStats, ApiError>({
        queryKey: queryKeys.rto.analytics(),
        queryFn: async () => {
            const response = await apiClient.get<{ data: RTOAnalyticsStats }>(
                '/rto/analytics/stats'
            );
            return response.data.data;
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Perform QC on RTO
 * POST /rto/events/:id/qc
 */
export const usePerformRTOQC = (options?: UseMutationOptions<RTOEvent, ApiError, PerformQCPayload>) => {
    const queryClient = useQueryClient();

    return useMutation<RTOEvent, ApiError, PerformQCPayload>({
        mutationFn: async (payload: PerformQCPayload) => {
            const response = await apiClient.post<{ data: RTOEvent }>(
                `/rto/events/${payload.rtoId}/qc`,
                {
                    status: payload.status,
                    notes: payload.notes,
                    images: payload.images,
                }
            );
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.rto.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() });
            showSuccessToast('RTO quality check completed successfully');
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
};

/**
 * Resolve RTO
 * POST /rto/events/:id/resolve
 */
export const useResolveRTO = (options?: UseMutationOptions<RTOEvent, ApiError, ResolveRTOPayload>) => {
    const queryClient = useQueryClient();

    return useMutation<RTOEvent, ApiError, ResolveRTOPayload>({
        mutationFn: async (payload: ResolveRTOPayload) => {
            const response = await apiClient.post<{ data: RTOEvent }>(
                `/rto/events/${payload.rtoId}/resolve`,
                {
                    resolution: payload.resolution,
                    refundAmount: payload.refundAmount,
                }
            );
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.rto.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() });
            showSuccessToast('RTO resolved successfully');
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
};

/**
 * Trigger RTO for shipment
 * POST /rto/trigger
 */
export const useTriggerRTO = (options?: UseMutationOptions<RTOEvent, ApiError, { shipmentId: string; reason: string }>) => {
    const queryClient = useQueryClient();

    return useMutation<RTOEvent, ApiError, { shipmentId: string; reason: string }>({
        mutationFn: async (payload: { shipmentId: string; reason: string }) => {
            const response = await apiClient.post<{ data: RTOEvent }>(
                '/rto/trigger',
                payload
            );
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.rto.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.shipments.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() });
            showSuccessToast('RTO triggered successfully');
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
};
