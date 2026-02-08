import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { Warehouse } from './useWarehouses';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError } from '@/src/lib/error';
import { toast } from 'sonner';

export const adminWarehouseKeys = {
    all: () => ['admin', 'warehouses'] as const,
    lists: () => [...adminWarehouseKeys.all(), 'list'] as const,
    list: (filters: string) => [...adminWarehouseKeys.lists(), { filters }] as const,
    details: () => [...adminWarehouseKeys.all(), 'detail'] as const,
    detail: (id: string) => [...adminWarehouseKeys.details(), id] as const,
};

export interface AdminWarehouseFilters {
    page?: number;
    limit?: number;
    search?: string;
    companyId?: string;
}

export const useAdminWarehouses = (
    filters: AdminWarehouseFilters = {},
    options?: UseQueryOptions<Warehouse[], ApiError>
) => {
    return useQuery<Warehouse[], ApiError>({
        queryKey: adminWarehouseKeys.list(JSON.stringify(filters)),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.page) params.append('page', filters.page.toString());
            if (filters.limit) params.append('limit', filters.limit.toString());
            if (filters.search) params.append('search', filters.search);
            if (filters.companyId) params.append('companyId', filters.companyId);

            const response = await apiClient.get(`/admin/warehouses?${params.toString()}`);
            // Handle both paginated structure and direct array if backend changes
            return response.data.data || response.data.warehouses || [];
        },
        ...CACHE_TIMES.MEDIUM, // Use medium cache for lists
        retry: RETRY_CONFIG.DEFAULT,
        placeholderData: (previousData) => previousData ?? [],
        ...options,
    });
};

export const useAdminWarehouse = (id: string, options?: UseQueryOptions<Warehouse, ApiError>) => {
    return useQuery<Warehouse, ApiError>({
        queryKey: adminWarehouseKeys.detail(id),
        queryFn: async () => {
            const response = await apiClient.get(`/admin/warehouses/${id}`);
            return response.data.data?.warehouse || response.data.warehouse;
        },
        enabled: !!id,
        ...options,
    });
};

export const useAdminUpdateWarehouse = () => {
    const queryClient = useQueryClient();

    return useMutation<Warehouse, ApiError, { id: string; data: Partial<Warehouse> }>({
        mutationFn: async ({ id, data }) => {
            const response = await apiClient.patch(`/admin/warehouses/${id}`, data);
            return response.data.data?.warehouse || response.data.warehouse;
        },
        onSuccess: (updatedWarehouse) => {
            toast.success('Warehouse updated successfully');
            queryClient.invalidateQueries({ queryKey: adminWarehouseKeys.lists() });
            queryClient.setQueryData(adminWarehouseKeys.detail(updatedWarehouse._id), updatedWarehouse);
        },
        onError: (error) => {
            handleApiError(error);
        },
    });
};

export const useAdminDeleteWarehouse = () => {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, string>({
        mutationFn: async (id) => {
            await apiClient.delete(`/admin/warehouses/${id}`);
        },
        onSuccess: () => {
            toast.success('Warehouse deleted');
            queryClient.invalidateQueries({ queryKey: adminWarehouseKeys.lists() });
        },
        onError: (error) => {
            handleApiError(error);
        },
    });
};
