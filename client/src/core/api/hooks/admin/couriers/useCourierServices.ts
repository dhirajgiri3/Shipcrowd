import { useMutation, useQuery, useQueryClient, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/src/core/api/http';
import { queryKeys } from '@/src/core/api/config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '@/src/core/api/config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

export interface CourierServiceItem {
    _id: string;
    provider: 'velocity' | 'delhivery' | 'ekart';
    serviceCode: string;
    providerServiceId?: string;
    displayName: string;
    serviceType: 'surface' | 'express' | 'air' | 'standard';
    flowType?: 'forward' | 'reverse' | 'both';
    status: 'active' | 'inactive' | 'hidden';
    zoneSupport?: string[];
    constraints?: {
        minWeightKg?: number;
        maxWeightKg?: number;
        maxCodValue?: number;
        maxPrepaidValue?: number;
        paymentModes?: Array<'cod' | 'prepaid' | 'pickup' | 'repl'>;
    };
    sla?: {
        eddMinDays?: number;
        eddMaxDays?: number;
    };
}

interface CourierServiceListResponse {
    success: boolean;
    data: CourierServiceItem[];
}

export const useCourierServices = (filters?: Record<string, any>, options?: UseQueryOptions<CourierServiceItem[], ApiError>) => {
    return useQuery<CourierServiceItem[], ApiError>({
        queryKey: queryKeys.courierServices.list(filters),
        queryFn: async () => {
            const response = await apiClient.get<CourierServiceListResponse>('/admin/courier-services', { params: filters });
            return response.data.data || [];
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        refetchOnWindowFocus: false, // Don't refetch when user switches tabs
        refetchOnReconnect: true,    // Do refetch after network restore
        ...options,
    });
};

export const useCreateCourierService = (options?: UseMutationOptions<CourierServiceItem, ApiError, Partial<CourierServiceItem>>) => {
    const queryClient = useQueryClient();
    return useMutation<CourierServiceItem, ApiError, Partial<CourierServiceItem>>({
        mutationFn: async (payload) => {
            const response = await apiClient.post('/admin/courier-services', payload);
            return response.data.data || response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.courierServices.all() });
            showSuccessToast('Courier service created');
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
};

export const useUpdateCourierService = (options?: UseMutationOptions<CourierServiceItem, ApiError, { id: string; data: Partial<CourierServiceItem> }>) => {
    const queryClient = useQueryClient();
    return useMutation<CourierServiceItem, ApiError, { id: string; data: Partial<CourierServiceItem> }>({
        mutationFn: async ({ id, data }) => {
            const response = await apiClient.put(`/admin/courier-services/${id}`, data);
            return response.data.data || response.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.courierServices.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.courierServices.detail(variables.id) });
            showSuccessToast('Courier service updated');
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
};

export const useToggleCourierServiceStatus = (
    options?: UseMutationOptions<
        CourierServiceItem,
        ApiError,
        string,
        { previousData: Map<string, CourierServiceItem[]> }
    >
) => {
    const queryClient = useQueryClient();
    return useMutation<
        CourierServiceItem,
        ApiError,
        string,
        { previousData: Map<string, CourierServiceItem[]> }
    >({
        mutationFn: async (id: string) => {
            const response = await apiClient.post(`/admin/courier-services/${id}/toggle-status`);
            return response.data.data || response.data;
        },
        // Optimistic update for instant UI feedback
        onMutate: async (id) => {
            // Cancel all courier service queries
            await queryClient.cancelQueries({ queryKey: queryKeys.courierServices.all() });

            // Get all queries with courier services data
            const previousData = new Map<string, CourierServiceItem[]>();
            const allQueries = queryClient.getQueriesData<CourierServiceItem[]>({
                queryKey: queryKeys.courierServices.all()
            });

            // Store previous data and optimistically update all matching queries
            allQueries.forEach(([queryKey, data]) => {
                if (data) {
                    previousData.set(JSON.stringify(queryKey), data);

                    // Optimistically toggle status in this query's data
                    const updatedData = data.map((service) =>
                        service._id === id
                            ? { ...service, status: (service.status === 'active' ? 'inactive' : 'active') as 'active' | 'inactive' | 'hidden' }
                            : service
                    );

                    queryClient.setQueryData(queryKey, updatedData);
                }
            });

            return { previousData };
        },
        onSuccess: () => {
            // Invalidate all service queries to refetch fresh data
            queryClient.invalidateQueries({ queryKey: queryKeys.courierServices.all() });
            showSuccessToast('Service status updated');
        },
        onError: (error, _variables, context) => {
            // Rollback all optimistic updates
            if (context?.previousData) {
                context.previousData.forEach((data, key) => {
                    queryClient.setQueryData(JSON.parse(key), data);
                });
            }
            handleApiError(error);
        },
        ...options,
    });
};

export const useSyncProviderServices = (options?: UseMutationOptions<any, ApiError, { provider: 'velocity' | 'delhivery' | 'ekart' }>) => {
    const queryClient = useQueryClient();
    return useMutation<any, ApiError, { provider: 'velocity' | 'delhivery' | 'ekart' }>({
        mutationFn: async ({ provider }) => {
            const response = await apiClient.post(`/admin/couriers/${provider}/services/sync`);
            return response.data.data || response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.courierServices.all() });
            showSuccessToast('Provider services synced');
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
};

export const useDeleteCourierService = (options?: UseMutationOptions<void, ApiError, string>) => {
    const queryClient = useQueryClient();
    return useMutation<void, ApiError, string>({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/admin/courier-services/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.courierServices.all() });
            showSuccessToast('Service deleted successfully');
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
};
