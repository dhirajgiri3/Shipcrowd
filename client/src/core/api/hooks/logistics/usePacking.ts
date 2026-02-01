import { useMutation, useQuery, useQueryClient, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { queryKeys, FilterParams } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

export interface PackingStation {
    _id: string;
    warehouseId: string;
    name: string;
    status?: string;
    isOnline?: boolean;
    assignedPackerId?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export function usePackingStations(
    filters?: FilterParams & { warehouseId?: string },
    options?: UseQueryOptions<PackingStation[], ApiError>
) {
    return useQuery<PackingStation[], ApiError>({
        queryKey: queryKeys.warehouseOps.packingStations(filters),
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: PackingStation[] }>(
                '/warehouses/packing/stations',
                { params: filters }
            );
            return data.data;
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function usePackingStation(
    id: string,
    options?: UseQueryOptions<PackingStation, ApiError>
) {
    return useQuery<PackingStation, ApiError>({
        queryKey: queryKeys.warehouseOps.packingStation(id),
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: PackingStation }>(
                '/warehouses/packing/stations/${id}'
            );
            return data.data;
        },
        enabled: !!id,
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useCreatePackingStation(
    options?: UseMutationOptions<PackingStation, ApiError, Record<string, any>>
) {
    const queryClient = useQueryClient();

    return useMutation<PackingStation, ApiError, Record<string, any>>({
        mutationFn: async (payload) => {
            const { data } = await apiClient.post<{ success: boolean; data: PackingStation }>(
                '/warehouses/packing/stations',
                payload
            );
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.warehouseOps.all() });
            showSuccessToast('Packing station created successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}
