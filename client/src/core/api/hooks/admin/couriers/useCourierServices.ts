import { useMutation, useQuery, useQueryClient, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/src/core/api/http';
import { queryKeys } from '@/src/core/api/config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '@/src/core/api/config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

export interface CourierServiceItem {
    _id: string;
    provider: 'velocity' | 'delhivery' | 'ekart';
    serviceCode: string;
    displayName: string;
    serviceType: 'surface' | 'express' | 'air' | 'standard';
    status: 'active' | 'inactive' | 'hidden';
    zoneSupport?: string[];
    constraints?: {
        minWeightKg?: number;
        maxWeightKg?: number;
        maxCodValue?: number;
        maxPrepaidValue?: number;
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

export const useToggleCourierServiceStatus = (options?: UseMutationOptions<CourierServiceItem, ApiError, string>) => {
    const queryClient = useQueryClient();
    return useMutation<CourierServiceItem, ApiError, string>({
        mutationFn: async (id: string) => {
            const response = await apiClient.post(`/admin/courier-services/${id}/toggle-status`);
            return response.data.data || response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.courierServices.all() });
            showSuccessToast('Courier service status updated');
        },
        onError: (error) => handleApiError(error),
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
