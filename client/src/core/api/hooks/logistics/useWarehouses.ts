import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../client';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

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
        coordinates?: {
            latitude: number;
            longitude: number;
        };
    };
    contactInfo: {
        name: string;
        phone: string;
        email?: string;
        alternatePhone?: string;
    };
    operatingHours?: {
        monday: { open: string | null; close: string | null };
        tuesday: { open: string | null; close: string | null };
        wednesday: { open: string | null; close: string | null };
        thursday: { open: string | null; close: string | null };
        friday: { open: string | null; close: string | null };
        saturday: { open: string | null; close: string | null };
        sunday: { open: string | null; close: string | null };
    };
    isActive: boolean;
    isDefault: boolean;
    isDeleted: boolean;
    carrierDetails?: {
        velocityWarehouseId?: string;
        delhiveryWarehouseId?: string;
        dtdcWarehouseId?: string;
        xpressbeesWarehouseId?: string;
        lastSyncedAt?: string;
    };
    createdAt: string;
    updatedAt: string;
}

// Mock data removed (migrated to real API)

export interface CreateWarehousePayload {
    name: string;
    address: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        country: string;
        postalCode: string;
        coordinates?: {
            latitude: number;
            longitude: number;
        };
    };
    contactInfo: {
        name: string;
        phone: string;
        email?: string;
        alternatePhone?: string;
    };
    operatingHours?: Warehouse['operatingHours'];
    isDefault?: boolean;
}

/**
 * Fetch user's warehouses
 */
export const useWarehouses = (options?: UseQueryOptions<Warehouse[], ApiError>) => {
    return useQuery<Warehouse[], ApiError>({
        queryKey: queryKeys.warehouses.all(),
        queryFn: async () => {
            const response = await apiClient.get('/warehouses');

            // Backend uses sendPaginated which returns { data: [...], pagination: {...} }
            // Extract warehouses from response.data.data (paginated endpoint)
            const warehouses = response.data.data || response.data.warehouses || [];

            return warehouses;
        },
        ...CACHE_TIMES.LONG,
        retry: RETRY_CONFIG.DEFAULT,
        placeholderData: [],
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
            // Backend returns: { success, data: { warehouse }, message, timestamp }
            // Axios wraps it: response.data = backend response
            // So the warehouse is at: response.data.data.warehouse
            return response.data.data.warehouse;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.all() });
            showSuccessToast('Warehouse created successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Update warehouse
 */
interface UpdateWarehouseContext {
    previousWarehouses?: Warehouse[];
}

export const useUpdateWarehouse = (options?: UseMutationOptions<any, ApiError, { warehouseId: string; data: Partial<CreateWarehousePayload> }, UpdateWarehouseContext>) => {
    const queryClient = useQueryClient();

    return useMutation<any, ApiError, { warehouseId: string; data: Partial<CreateWarehousePayload> }, UpdateWarehouseContext>({
        mutationFn: async ({ warehouseId, data }) => {
            const response = await apiClient.patch(`/warehouses/${warehouseId}`, data);
            return response.data.data;
        },
        onSuccess: async (data) => {
            console.log('=== [useUpdateWarehouse] onSuccess FIRED ===');
            console.log('[useUpdateWarehouse] Raw data received:', data);
            console.log('[useUpdateWarehouse] data.warehouses exists?', !!data?.warehouses);
            console.log('[useUpdateWarehouse] data.warehouses is array?', Array.isArray(data?.warehouses));

            // ✅ FIX: Use server-provided warehouses list to update cache immediately
            // This prevents race conditions with MongoDB index updates
            if (data?.warehouses && Array.isArray(data.warehouses)) {
                console.log('[useUpdateWarehouse] ✅ Updating cache with server warehouses:', data.warehouses.length, 'items');
                const defaultWarehouse = data.warehouses.find((w: Warehouse) => w.isDefault);
                console.log('[useUpdateWarehouse] Default warehouse after update:', {
                    id: defaultWarehouse?._id,
                    name: defaultWarehouse?.name,
                    isDefault: defaultWarehouse?.isDefault
                });

                // Log all warehouse default states
                console.log('[useUpdateWarehouse] All warehouse default states:');
                data.warehouses.forEach((w: Warehouse) => {
                    console.log(`  - ${w.name}: isDefault = ${w.isDefault}`);
                });

                // Update the cache
                console.log('[useUpdateWarehouse] Setting queryClient data for key queryKeys.warehouses.all()');
                queryClient.setQueryData<Warehouse[]>(queryKeys.warehouses.all(), data.warehouses);
                console.log('[useUpdateWarehouse] ✅ Cache updated successfully');

                // Verify cache was actually updated
                const cachedData = queryClient.getQueryData<Warehouse[]>(queryKeys.warehouses.all());
                console.log('[useUpdateWarehouse] Verifying cached data:', cachedData?.length, 'items');
                if (cachedData) {
                    const cachedDefault = cachedData.find(w => w.isDefault);
                    console.log('[useUpdateWarehouse] Cached default warehouse:', cachedDefault?.name);
                }
            } else {
                console.warn('[useUpdateWarehouse] ❌ No warehouses array in response!');
                console.warn('[useUpdateWarehouse] Response structure:', Object.keys(data || {}));
                console.warn('[useUpdateWarehouse] Falling back to invalidateQueries');
                // Fallback: invalidate if backend doesn't return warehouses array
                await queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.all() });
            }
            showSuccessToast('Warehouse updated successfully');
            console.log('=== [useUpdateWarehouse] onSuccess COMPLETE ===');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Delete warehouse
 */
export const useDeleteWarehouse = (options?: UseMutationOptions<void, ApiError, string, { previousWarehouses?: Warehouse[] }>) => {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, string, { previousWarehouses?: Warehouse[] }>({
        mutationFn: async (id) => {
            await apiClient.delete(`/warehouses/${id}`);
        },
        onMutate: async (deletedId) => {
            await queryClient.cancelQueries({ queryKey: queryKeys.warehouses.all() });
            const previousWarehouses = queryClient.getQueryData<Warehouse[]>(queryKeys.warehouses.all());

            if (previousWarehouses) {
                queryClient.setQueryData<Warehouse[]>(
                    queryKeys.warehouses.all(),
                    previousWarehouses.filter(w => w._id !== deletedId)
                );
            }
            return { previousWarehouses };
        },
        onError: (err, newTodo, context) => {
            if (context?.previousWarehouses) {
                queryClient.setQueryData(queryKeys.warehouses.all(), context.previousWarehouses);
            }
            handleApiError(err, 'Failed to delete warehouse');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.all() });
        },
        onSuccess: () => {
            showSuccessToast('Pickup address deleted successfully');
        },
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};
