import { useMutation, useQuery, useQueryClient, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

export interface PODResponse {
    shipmentId: string;
    podUrl: string;
    source: 'manual' | 'courier_api' | 'not_supported';
}

/**
 * Get POD for a shipment
 */
export function useShipmentPOD(
    shipmentId: string,
    options?: UseQueryOptions<PODResponse, ApiError>
) {
    return useQuery<PODResponse, ApiError>({
        queryKey: queryKeys.shipments.pod(shipmentId),
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: PODResponse }>(
                `/shipments/${shipmentId}/pod`
            );
            return data.data;
        },
        enabled: !!shipmentId,
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Upload POD manually
 */
export function useUploadShipmentPOD(
    options?: UseMutationOptions<PODResponse, ApiError, { shipmentId: string; file: File }>
) {
    const queryClient = useQueryClient();

    return useMutation<PODResponse, ApiError, { shipmentId: string; file: File }>({
        mutationFn: async ({ shipmentId, file }) => {
            const formData = new FormData();
            formData.append('file', file);

            const { data } = await apiClient.post<{ success: boolean; data: PODResponse }>(
                `/shipments/${shipmentId}/pod/upload`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );

            return data.data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.shipments.pod(variables.shipmentId) });
            showSuccessToast('POD uploaded successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}
