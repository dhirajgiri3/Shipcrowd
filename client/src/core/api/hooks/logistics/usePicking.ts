import { useMutation, useQuery, useQueryClient, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { queryKeys, FilterParams } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

export interface PickList {
    _id: string;
    warehouseId: string;
    status: string;
    assignedTo?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

interface PaginatedResult<T> {
    data: T[];
    pagination?: any;
}

export function usePickLists(
    filters?: FilterParams & { warehouseId?: string; status?: string },
    options?: UseQueryOptions<PaginatedResult<PickList>, ApiError>
) {
    return useQuery<PaginatedResult<PickList>, ApiError>({
        queryKey: queryKeys.warehouseOps.pickLists(filters),
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: PickList[]; pagination?: any }>(
                '/warehouses/picking/pick-lists',
                { params: filters }
            );
            return { data: data.data, pagination: data.pagination };
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useMyPickLists(
    filters?: FilterParams & { status?: string },
    options?: UseQueryOptions<PaginatedResult<PickList>, ApiError>
) {
    return useQuery<PaginatedResult<PickList>, ApiError>({
        queryKey: queryKeys.warehouseOps.myPickLists(filters),
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: PickList[]; pagination?: any }>(
                '/warehouses/picking/my-pick-lists',
                { params: filters }
            );
            return { data: data.data, pagination: data.pagination };
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function usePickList(
    id: string,
    options?: UseQueryOptions<PickList, ApiError>
) {
    return useQuery<PickList, ApiError>({
        queryKey: queryKeys.warehouseOps.pickList(id),
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: PickList }>(
                `/warehouses/picking/pick-lists/${id}`
            );
            return data.data;
        },
        enabled: !!id,
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useStartPicking(
    options?: UseMutationOptions<any, ApiError, { id: string }>
) {
    const queryClient = useQueryClient();

    return useMutation<any, ApiError, { id: string }>({
        mutationFn: async ({ id }) => {
            const { data } = await apiClient.post<{ success: boolean; data: any }>(
                `/warehouses/picking/pick-lists/${id}/start`
            );
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.warehouseOps.all() });

        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}
