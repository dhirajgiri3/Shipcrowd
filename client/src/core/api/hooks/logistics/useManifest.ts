import { useMutation, useQuery, useQueryClient, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import type {
    Manifest,
    ManifestListFilters,
    ManifestListResponse,
    ManifestStats,
    CreateManifestPayload,
    EligibleManifestShipment,
} from '@/src/types/api/orders';

/**
 * Manifest Management Hooks
 *
 * Purpose: Manage shipping manifests (bulk pickup scheduling)
 */

export interface UpdateManifestPayload {
    pickup?: {
        scheduledDate?: string;
        timeSlot?: string;
        contactPerson?: string;
        contactPhone?: string;
    };
    notes?: string;
}

/**
 * List manifests with filters
 */
export function useShipmentManifestsList(
    filters?: ManifestListFilters,
    options?: UseQueryOptions<ManifestListResponse, ApiError>
) {
    return useQuery<ManifestListResponse, ApiError>({
        queryKey: queryKeys.shipments.manifests(filters as any),
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: ManifestListResponse }>(
                '/shipments/manifests',
                { params: filters as any }
            );
            return data.data;
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Get manifest by ID
 */
export function useShipmentManifest(
    id: string,
    options?: UseQueryOptions<Manifest, ApiError>
) {
    return useQuery<Manifest, ApiError>({
        queryKey: queryKeys.shipments.manifest(id),
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: Manifest }>(
                `/shipments/manifests/${id}`
            );
            return data.data;
        },
        enabled: !!id,
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Manifest stats
 */
export function useShipmentManifestStats(
    options?: UseQueryOptions<ManifestStats, ApiError>
) {
    return useQuery<ManifestStats, ApiError>({
        queryKey: queryKeys.shipments.manifestStats(),
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: ManifestStats }>(
                '/shipments/manifests/stats'
            );
            return data.data;
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Eligible shipments for manifest creation
 */
export function useEligibleManifestShipments(
    carrier?: string,
    warehouseId?: string,
    options?: Omit<UseQueryOptions<EligibleManifestShipment[], ApiError>, 'queryKey'>
) {
    return useQuery<EligibleManifestShipment[], ApiError>({
        queryKey: queryKeys.shipments.manifestEligible(carrier, warehouseId),
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: EligibleManifestShipment[] }>(
                '/shipments/manifests/eligible-shipments',
                { params: { carrier, warehouseId } }
            );
            return data.data;
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Create manifest
 */
export function useCreateShipmentManifest(
    options?: UseMutationOptions<Manifest, ApiError, CreateManifestPayload>
) {
    const queryClient = useQueryClient();

    return useMutation<Manifest, ApiError, CreateManifestPayload>({
        mutationFn: async (payload) => {
            const { data } = await apiClient.post<{ success: boolean; data: Manifest }>(
                '/shipments/manifest',
                payload
            );
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.shipments.all() });

        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Update manifest (pickup details, notes)
 */
export function useUpdateManifest(
    options?: UseMutationOptions<Manifest, ApiError, { id: string; data: UpdateManifestPayload }>
) {
    const queryClient = useQueryClient();

    return useMutation<Manifest, ApiError, { id: string; data: UpdateManifestPayload }>({
        mutationFn: async ({ id, data }) => {
            const response = await apiClient.patch<{ success: boolean; data: Manifest }>(
                `/shipments/manifests/${id}`,
                data
            );
            return response.data.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.shipments.manifests() });
            queryClient.invalidateQueries({ queryKey: queryKeys.shipments.manifest(variables.id) });

        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Delete manifest (only if status is 'open')
 */
export function useDeleteManifest(
    options?: UseMutationOptions<void, ApiError, string>
) {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, string>({
        mutationFn: async (id) => {
            await apiClient.delete(`/shipments/manifests/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.shipments.manifests() });

        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Add shipments to manifest
 */
export function useAddShipmentsToManifest(
    options?: UseMutationOptions<Manifest, ApiError, { id: string; shipmentIds: string[] }>
) {
    const queryClient = useQueryClient();

    return useMutation<Manifest, ApiError, { id: string; shipmentIds: string[] }>({
        mutationFn: async ({ id, shipmentIds }) => {
            const { data } = await apiClient.post<{ success: boolean; data: Manifest }>(
                `/shipments/manifests/${id}/add-shipments`,
                { shipmentIds }
            );
            return data.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.shipments.manifests() });
            queryClient.invalidateQueries({ queryKey: queryKeys.shipments.manifest(variables.id) });

        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Remove shipments from manifest
 */
export function useRemoveShipmentsFromManifest(
    options?: UseMutationOptions<Manifest, ApiError, { id: string; shipmentIds: string[] }>
) {
    const queryClient = useQueryClient();

    return useMutation<Manifest, ApiError, { id: string; shipmentIds: string[] }>({
        mutationFn: async ({ id, shipmentIds }) => {
            const { data } = await apiClient.post<{ success: boolean; data: Manifest }>(
                `/shipments/manifests/${id}/remove-shipments`,
                { shipmentIds }
            );
            return data.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.shipments.manifests() });
            queryClient.invalidateQueries({ queryKey: queryKeys.shipments.manifest(variables.id) });

        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Close manifest and schedule pickup
 */
export function useCloseManifest(
    options?: UseMutationOptions<Manifest, ApiError, string>
) {
    const queryClient = useQueryClient();

    return useMutation<Manifest, ApiError, string>({
        mutationFn: async (id) => {
            const { data } = await apiClient.post<{ success: boolean; data: Manifest }>(
                `/shipments/manifests/${id}/close`
            );
            return data.data;
        },
        onSuccess: (_, manifestId) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.shipments.manifests() });
            queryClient.invalidateQueries({ queryKey: queryKeys.shipments.manifest(manifestId) });

        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Mark manifest as handed over to carrier
 */
export function useHandoverManifest(
    options?: UseMutationOptions<Manifest, ApiError, string>
) {
    const queryClient = useQueryClient();

    return useMutation<Manifest, ApiError, string>({
        mutationFn: async (id) => {
            const { data } = await apiClient.post<{ success: boolean; data: Manifest }>(
                `/shipments/manifests/${id}/handover`
            );
            return data.data;
        },
        onSuccess: (_, manifestId) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.shipments.manifests() });
            queryClient.invalidateQueries({ queryKey: queryKeys.shipments.manifest(manifestId) });

        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Download manifest PDF
 * Returns a blob URL for the PDF
 * @param options.suppressDefaultErrorHandling - When true, caller handles errors (e.g. inline toast); avoids duplicate toasts
 */
export function useDownloadManifestPDF(options?: { suppressDefaultErrorHandling?: boolean }) {
    return useMutation<string, ApiError, string>({
        mutationFn: async (id) => {
            const response = await apiClient.get(
                `/shipments/manifests/${id}/download`,
                { responseType: 'blob' }
            );

            // Create blob URL
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);

            return url;
        },
        onError: (error) => {
            if (!options?.suppressDefaultErrorHandling) {
                handleApiError(error);
            }
        },
        retry: RETRY_CONFIG.DEFAULT,
    });
}
