import { apiClient, ApiError } from '../lib/api/client';
import { handleApiError, showSuccessToast } from '../lib/api/error-handler';
import {
    useQuery,
    useMutation,
    useQueryClient,
    UseQueryOptions,
    UseMutationOptions,
} from '@tanstack/react-query';

export interface Warehouse {
    _id: string;
    companyId: string;
    name: string;
    address: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        country: string;
        postalCode: string;
    };
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateWarehousePayload {
    name: string;
    address: Warehouse['address'];
    isDefault?: boolean;
}

/**
 * Fetch user's warehouses
 */
export const useWarehouses = (options?: UseQueryOptions<Warehouse[], ApiError>) => {
    return useQuery<Warehouse[], ApiError>({
        queryKey: ['warehouses'],
        queryFn: async () => {
            const response = await apiClient.get('/warehouses');
            return response.data.warehouses;
        },
        staleTime: 600000, // 10 minutes - warehouses don't change often
        ...options,
    });
};

/**
 * Create new warehouse
 */
export const useCreateWarehouse = (options?: UseMutationOptions<Warehouse, ApiError, CreateWarehousePayload>) => {
    const queryClient = useQueryClient();

    return useMutation<Warehouse, ApiError, CreateWarehousePayload>({
        mutationFn: async (payload) => {
            const response = await apiClient.post('/warehouses', payload);
            return response.data.warehouse;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['warehouses'] });
            showSuccessToast('Warehouse created successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Create Warehouse Failed');
        },
        ...options,
    });
};

/**
 * Update warehouse
 */
export const useUpdateWarehouse = (options?: UseMutationOptions<Warehouse, ApiError, { warehouseId: string; data: Partial<CreateWarehousePayload> }>) => {
    const queryClient = useQueryClient();

    return useMutation<Warehouse, ApiError, { warehouseId: string; data: Partial<CreateWarehousePayload> }>({
        mutationFn: async ({ warehouseId, data }) => {
            const response = await apiClient.patch(`/warehouses/${warehouseId}`, data);
            return response.data.warehouse;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['warehouses'] });
            showSuccessToast('Warehouse updated successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Update Warehouse Failed');
        },
        ...options,
    });
};

/**
 * Delete warehouse
 */
export const useDeleteWarehouse = (options?: UseMutationOptions<void, ApiError, string>) => {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, string>({
        mutationFn: async (warehouseId) => {
            await apiClient.delete(`/warehouses/${warehouseId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['warehouses'] });
            showSuccessToast('Warehouse deleted successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Delete Warehouse Failed');
        },
        ...options,
    });
};
