import { useState } from 'react';
import { useMutation, useQuery, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/src/core/api/http';
import { queryKeys } from '@/src/core/api/config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '@/src/core/api/config/cache.config';
import { showSuccessToast, handleApiError } from '@/src/lib/error';
import type {
    Courier,
    CourierPerformance,
    UpdateCourierRequest,
    PerformanceFilters,
    CourierDetailResponse,
    CourierPerformanceResponse,
} from '@/src/types/api/logistics';

// ==================== Types ====================

// Legacy type for the List View (from useCarriers)
// This matches the currently working /admin/carriers endpoint
export interface CourierListItem {
    id: string;
    name: string;
    code: string;
    logo: string;
    status: 'active' | 'inactive';
    services: string[];
    zones: string[];
    apiIntegrated: boolean;
    pickupEnabled: boolean;
    codEnabled: boolean;
    trackingEnabled: boolean;
    codLimit: number;
    weightLimit: number;
    credentialsConfigured?: boolean;
    totalShipments?: number;
    avgDeliveryTime?: string;
    successRate?: number;
}

interface CouriersListResponse {
    success: boolean;
    data: CourierListItem[];
}

// ==================== QUERIES ====================

/**
 * Fetch all couriers (List View)
 */
export const useCouriers = (options?: UseQueryOptions<CourierListItem[], ApiError>) => {
    return useQuery<CourierListItem[], ApiError>({
        queryKey: queryKeys.couriers.list(),
        queryFn: async () => {
            const { data } = await apiClient.get<CouriersListResponse>('/admin/couriers');
            return data.data;
        },
        ...CACHE_TIMES.LONG,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Fetch single courier by ID (Detail View)
 * Uses /admin/couriers/:id endpoint which likely uses the new Courier shape
 */
export const useCourier = (id: string | undefined, options?: UseQueryOptions<Courier, ApiError>) => {
    return useQuery<Courier, ApiError>({
        queryKey: queryKeys.couriers.detail(id!),
        queryFn: async () => {
            const response = await apiClient.get<CourierDetailResponse>(`/admin/couriers/${id}`);
            return response.data.data;
        },
        enabled: !!id,
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Fetch courier performance metrics
 */
export const useCourierPerformance = (id: string | undefined, filters?: PerformanceFilters, options?: UseQueryOptions<CourierPerformance, ApiError>) => {
    return useQuery<CourierPerformance, ApiError>({
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
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

// ==================== MUTATIONS ====================

/**
 * Update courier details
 */
export const useUpdateCourier = (options?: UseMutationOptions<Courier, ApiError, { id: string; data: UpdateCourierRequest }>) => {
    const queryClient = useQueryClient();

    return useMutation<Courier, ApiError, { id: string; data: UpdateCourierRequest }>({
        mutationFn: async ({ id, data }: { id: string; data: UpdateCourierRequest }) => {
            const response = await apiClient.put<CourierDetailResponse>(`/admin/couriers/${id}`, data);
            return response.data.data;
        },
        onSuccess: (_, variables) => {
            // Invalidate detail query
            queryClient.invalidateQueries({ queryKey: queryKeys.couriers.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.couriers.list() });
            showSuccessToast('Courier updated successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.NO_RETRY,
        ...options,
    });
};

/**
 * Toggle courier active status
 */
export const useToggleCourierStatus = (options?: UseMutationOptions<Courier, ApiError, string>) => {
    const queryClient = useQueryClient();

    return useMutation<Courier, ApiError, string>({
        mutationFn: async (id: string) => {
            const response = await apiClient.post<CourierDetailResponse>(
                `/admin/couriers/${id}/toggle-status`
            );
            return response.data.data;
        },
        onSuccess: (data, id) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.couriers.detail(id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.couriers.list() });
            showSuccessToast(`Courier ${data.isActive ? 'activated' : 'deactivated'} successfully`);
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.NO_RETRY,
        ...options,
    });
};

// ===================== Page Controller =====================

export function useCouriersPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');

    const { data: carriers = [], isLoading, isError, error, refetch } = useCouriers();

    const filteredCouriers = carriers.filter(carrier => {
        const matchesSearch = carrier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            carrier.code.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = selectedStatus === 'all' || carrier.status === selectedStatus;
        return matchesSearch && matchesStatus;
    });

    return {
        // State
        searchQuery,
        setSearchQuery,
        selectedStatus,
        setSelectedStatus,

        // Data
        carriers,
        filteredCouriers,
        isLoading,
        isError,
        error,

        // Actions
        refetch
    };
}
