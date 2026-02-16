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

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext?: boolean;
    hasPrev?: boolean;
}

export interface AdminWarehousesResponse {
    warehouses: Warehouse[];
    pagination: PaginationMeta;
}

export const useAdminWarehouses = (
    filters: AdminWarehouseFilters = {},
    options?: UseQueryOptions<AdminWarehousesResponse, ApiError>
) => {
    return useQuery<AdminWarehousesResponse, ApiError>({
        queryKey: adminWarehouseKeys.list(JSON.stringify(filters)),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.page) params.append('page', filters.page.toString());
            if (filters.limit) params.append('limit', filters.limit.toString());
            if (filters.search) params.append('search', filters.search);
            if (filters.companyId) params.append('companyId', filters.companyId);

            const response = await apiClient.get(`/admin/warehouses?${params.toString()}`);
            const raw = response.data;
            const items = raw?.data ?? raw?.warehouses ?? (Array.isArray(raw) ? raw : []);
            const warehouses = Array.isArray(items) ? items : [];

            const pag = raw?.pagination;
            const pagination: PaginationMeta = pag
                ? {
                    page: pag.page ?? 1,
                    limit: pag.limit ?? 10,
                    total: pag.total ?? 0,
                    totalPages: pag.pages ?? pag.totalPages ?? 1,
                    hasNext: pag.hasNext,
                    hasPrev: pag.hasPrev,
                }
                : { page: 1, limit: 10, total: warehouses.length, totalPages: 1 };

            return { warehouses, pagination };
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        placeholderData: (previousData) => previousData, // Keep previous data during pagination for smooth UX
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
