import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../config/client';
import { queryKeys } from '../config/queryKeys';
import type {
    Courier,
    CourierPerformance,
    UpdateCourierRequest,
    PerformanceFilters,
    CourierDetailResponse,
    CourierPerformanceResponse,
} from '@/src/types/api/couriers.types';
import { toast } from 'sonner';
import { handleApiError } from '@/src/lib/error-handler';

// ==================== QUERIES ====================

/**
 * Fetch single courier by ID
 */
export const useCourier = (id: string | undefined) => {
    return useQuery({
        queryKey: queryKeys.couriers.detail(id!),
        queryFn: async () => {
            const response = await apiClient.get<CourierDetailResponse>(`/admin/couriers/${id}`);
            return response.data.data;
        },
        enabled: !!id,
    });
};

/**
 * Fetch courier performance metrics
 */
export const useCourierPerformance = (id: string | undefined, filters?: PerformanceFilters) => {
    return useQuery({
        queryKey: queryKeys.couriers.performance(id!, filters),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters?.startDate) params.append('startDate', filters.startDate);
            if (filters?.endDate) params.append('endDate', filters.endDate);
            if (filters?.zone) params.append('zone', filters.zone);
            if (filters?.serviceType) params.append('serviceType', filters.serviceType);

            const response = await apiClient.get<CourierPerformanceResponse>(
                `/admin/couriers/${id}/performance?${params.toString()}`
            );
            return response.data.data;
        },
        enabled: !!id,
    });
};

// ==================== MUTATIONS ====================

/**
 * Update courier details
 */
export const useUpdateCourier = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: UpdateCourierRequest }) => {
            const response = await apiClient.put<CourierDetailResponse>(`/admin/couriers/${id}`, data);
            return response.data.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.couriers.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.couriers.detail(variables.id) });
            toast.success('Courier updated successfully');
        },
        onError: (error: any) => {
            handleApiError(error, 'Failed to update courier');
        },
    });
};

/**
 * Toggle courier active status
 */
export const useToggleCourierStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const response = await apiClient.post<CourierDetailResponse>(
                `/admin/couriers/${id}/toggle-status`
            );
            return response.data.data;
        },
        onSuccess: (data, id) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.couriers.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.couriers.detail(id) });
            toast.success(`Courier ${data.isActive ? 'activated' : 'deactivated'} successfully`);
        },
        onError: (error: any) => {
            handleApiError(error, 'Failed to toggle courier status');
        },
    });
};

/**
 * Test courier integration connection
 */
export const useTestCourierIntegration = () => {
    return useMutation({
        mutationFn: async (id: string) => {
            const response = await apiClient.post<{ success: boolean; message: string }>(
                `/admin/couriers/${id}/test-connection`
            );
            return response.data;
        },
        onSuccess: (data) => {
            if (data.success) {
                toast.success('Integration test successful');
            } else {
                toast.error(data.message || 'Integration test failed');
            }
        },
        onError: (error: any) => {
            handleApiError(error, 'Failed to test integration');
        },
    });
};
