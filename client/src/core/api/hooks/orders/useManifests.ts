/**
 * Manifest API Hooks
 * 
 * React Query hooks for manifest management, pickup coordination,
 * and reconciliation operations.
 * Backend: GET/POST /api/v1/manifests/*
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '@/src/core/api/http';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

// ==================== Import Types ====================
import type {
    Manifest,
    ManifestStats,
    ManifestListFilters,
    ManifestListResponse,
    CreateManifestPayload,
    CreateManifestResponse,
    ReconciliationPayload,
    ReconciliationResult,
    ManifestShipment,
    CourierPartner,
} from '@/src/types/api/orders';

// ==================== Query Hooks ====================

/**
 * Get list of manifests with filters and pagination
 */
export const useManifests = (
    filters?: ManifestListFilters,
    options?: Omit<UseQueryOptions<ManifestListResponse>, 'queryKey' | 'queryFn'>
) => {
    return useQuery<ManifestListResponse>({
        queryKey: queryKeys.manifests.list(filters as any),
        queryFn: async () => {
            const response = await apiClient.get('/manifests', { params: filters });
            return response.data.data;
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        placeholderData: (previousData) => previousData,
        ...options,
    });
};

/**
 * Get single manifest by ID
 */
export const useManifest = (
    manifestId: string,
    options?: Omit<UseQueryOptions<Manifest>, 'queryKey' | 'queryFn'>
) => {
    return useQuery<Manifest>({
        queryKey: queryKeys.manifests.detail(manifestId),
        queryFn: async () => {
            const response = await apiClient.get(`/manifests/${manifestId}`);
            return response.data.data;
        },
        enabled: !!manifestId,
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Get manifest statistics
 */
export const useManifestStats = (
    options?: Omit<UseQueryOptions<ManifestStats>, 'queryKey' | 'queryFn'>
) => {
    return useQuery<ManifestStats>({
        queryKey: queryKeys.manifests.stats(),
        queryFn: async () => {
            const response = await apiClient.get('/manifests/stats');
            return response.data.data;
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Get shipments eligible for manifest (ready for pickup)
 */
export const useEligibleShipments = (
    courier?: CourierPartner,
    options?: Omit<UseQueryOptions<ManifestShipment[]>, 'queryKey' | 'queryFn'>
) => {
    return useQuery<ManifestShipment[]>({
        queryKey: queryKeys.manifests.eligibleShipments(courier),
        queryFn: async () => {
            const response = await apiClient.get('/manifests/eligible-shipments', {
                params: { courier },
            });
            return response.data.data;
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Get manifests pending reconciliation
 */
export const usePendingReconciliation = (
    options?: Omit<UseQueryOptions<Manifest[]>, 'queryKey' | 'queryFn'>
) => {
    return useQuery<Manifest[]>({
        queryKey: queryKeys.manifests.pendingReconciliation(),
        queryFn: async () => {
            const response = await apiClient.get('/manifests/pending-reconciliation');
            return response.data.data;
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

// ==================== Mutation Hooks ====================

/**
 * Create a new manifest
 */
export const useCreateManifest = () => {
    const queryClient = useQueryClient();

    return useMutation<CreateManifestResponse, Error, CreateManifestPayload>({
        mutationFn: async (payload) => {
            const response = await apiClient.post('/manifests', payload);
            return response.data.data;
        },
        onSuccess: (data) => {
            // Invalidate manifest list and stats
            queryClient.invalidateQueries({ queryKey: queryKeys.manifests.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.shipments.list() });
            showSuccessToast(`Manifest ${data.manifest.manifestId} created successfully`);
        },
        onError: (error) => {
            handleApiError(error, 'Failed to Create Manifest');
        },
    });
};

/**
 * Mark shipments as picked up (quick action)
 */
export const useMarkPickedUp = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, { manifestId: string; shipmentIds: string[] }>({
        mutationFn: async ({ manifestId, shipmentIds }) => {
            await apiClient.post(`/manifests/${manifestId}/mark-picked-up`, { shipmentIds });
        },
        onSuccess: (_, { manifestId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.manifests.detail(manifestId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.manifests.list() });
            queryClient.invalidateQueries({ queryKey: queryKeys.manifests.stats() });
            showSuccessToast('Shipments marked as picked up');
        },
        onError: (error) => {
            handleApiError(error, 'Failed to Update Pickup Status');
        },
    });
};

/**
 * Submit manifest reconciliation
 */
export const useSubmitReconciliation = () => {
    const queryClient = useQueryClient();

    return useMutation<ReconciliationResult, Error, ReconciliationPayload>({
        mutationFn: async (payload) => {
            const response = await apiClient.post(`/manifests/${payload.manifestId}/reconcile`, payload);
            return response.data.data;
        },
        onSuccess: (data, { manifestId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.manifests.detail(manifestId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.manifests.list() });
            queryClient.invalidateQueries({ queryKey: queryKeys.manifests.pendingReconciliation() });
            queryClient.invalidateQueries({ queryKey: queryKeys.manifests.stats() });

            if (data.status === 'COMPLETED') {
                showSuccessToast('Reconciliation completed successfully');
            } else {
                showSuccessToast(`Reconciliation completed with ${data.discrepancies.length} discrepancies`);
            }
        },
        onError: (error) => {
            handleApiError(error, 'Reconciliation Failed');
        },
    });
};

/**
 * Cancel a manifest
 */
export const useCancelManifest = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, { manifestId: string; reason?: string }>({
        mutationFn: async ({ manifestId, reason }) => {
            await apiClient.post(`/manifests/${manifestId}/cancel`, { reason });
        },
        onSuccess: (_, { manifestId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.manifests.detail(manifestId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.manifests.list() });
            queryClient.invalidateQueries({ queryKey: queryKeys.manifests.stats() });
            showSuccessToast('Manifest cancelled');
        },
        onError: (error) => {
            handleApiError(error, 'Failed to Cancel Manifest');
        },
    });
};

/**
 * Download manifest PDF
 */
export const useDownloadManifestPdf = () => {
    return useMutation<Blob, Error, string>({
        mutationFn: async (manifestId) => {
            const response = await apiClient.get(`/manifests/${manifestId}/pdf`, {
                responseType: 'blob',
            });
            return response.data;
        },
        onSuccess: (blob, manifestId) => {
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `manifest-${manifestId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            showSuccessToast('Manifest PDF downloaded');
        },
        onError: (error) => {
            handleApiError(error, 'Failed to Download PDF');
        },
    });
};

/**
 * Reschedule pickup for manifest
 */
export const useReschedulePickup = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, { manifestId: string; newDate: string; newSlot?: { start: string; end: string } }>({
        mutationFn: async ({ manifestId, newDate, newSlot }) => {
            await apiClient.post(`/manifests/${manifestId}/reschedule`, { newDate, newSlot });
        },
        onSuccess: (_, { manifestId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.manifests.detail(manifestId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.manifests.list() });
            showSuccessToast('Pickup rescheduled successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Failed to Reschedule Pickup');
        },
    });
};
