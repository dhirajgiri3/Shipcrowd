import { useMutation, useQuery, useQueryClient, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { queryKeys, FilterParams } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

export interface InventoryItem {
    _id: string;
    warehouseId: string;
    sku: string;
    productName?: string;
    quantity: number;
    reservedQuantity?: number;
    damagedQuantity?: number;
    location?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface InventoryListFilters extends FilterParams {
    warehouseId?: string;
    sku?: string;
    search?: string;
}

interface PaginatedResult<T> {
    data: T[];
    pagination?: any;
}

export function useInventory(
    filters?: InventoryListFilters,
    options?: UseQueryOptions<PaginatedResult<InventoryItem>, ApiError>
) {
    return useQuery<PaginatedResult<InventoryItem>, ApiError>({
        queryKey: queryKeys.warehouseOps.inventory(filters),
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: InventoryItem[]; pagination?: any }>(
                '/warehouses/inventory',
                { params: filters }
            );
            return { data: data.data, pagination: data.pagination };
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useInventoryItem(
    id: string,
    options?: UseQueryOptions<InventoryItem, ApiError>
) {
    return useQuery<InventoryItem, ApiError>({
        queryKey: queryKeys.warehouseOps.inventoryItem(id),
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: InventoryItem }>(`/warehouses/inventory/${id}`);
            return data.data;
        },
        enabled: !!id,
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export interface AdjustStockPayload {
    inventoryId: string;
    data: Record<string, any>;
}

export function useAdjustStock(
    options?: UseMutationOptions<any, ApiError, AdjustStockPayload>
) {
    const queryClient = useQueryClient();

    return useMutation<any, ApiError, AdjustStockPayload>({
        mutationFn: async ({ inventoryId, data }) => {
            const res = await apiClient.post<{ success: boolean; data: any }>(
                `/warehouses/inventory/${inventoryId}/adjust`,
                data
            );
            return res.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.warehouseOps.all() });
            showSuccessToast('Stock adjusted successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export interface ImportInventoryPayload {
    warehouseId: string;
    file: File;
}

export function useImportInventory(
    options?: UseMutationOptions<any, ApiError, ImportInventoryPayload>
) {
    const queryClient = useQueryClient();

    return useMutation<any, ApiError, ImportInventoryPayload>({
        mutationFn: async ({ warehouseId, file }) => {
            const formData = new FormData();
            formData.append('file', file);

            const res = await apiClient.post<{ success: boolean; data: any }>(
                `/warehouses/${warehouseId}/import`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            return res.data.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.warehouseOps.all() });
            showSuccessToast(`Import successful: ${data.success} rows processed, ${data.failed} failed.`);
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}
