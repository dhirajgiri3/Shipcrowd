import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../../http';
import {
    SalesRep,
    SalesRepListResponse,
    SalesRepListFilter,
    CreateSalesRepPayload,
    UpdateSalesRepPayload,
    SalesRepPerformance
} from '@/src/types/domain/sales-rep';
import { queryKeys } from '../../../config/query-keys';
import { showSuccessToast } from '@/src/lib/error';

// Helper to build query keys if not already in global config
const salesKeys = {
    all: ['admin', 'sales-reps'] as const,
    lists: () => [...salesKeys.all, 'list'] as const,
    list: (filters: SalesRepListFilter) => [...salesKeys.lists(), filters] as const,
    details: () => [...salesKeys.all, 'detail'] as const,
    detail: (id: string) => [...salesKeys.details(), id] as const,
    performances: () => [...salesKeys.all, 'performance'] as const,
    performance: (id: string) => [...salesKeys.performances(), id] as const,
};

export function useSalesRepList(
    filters: SalesRepListFilter = {},
    options?: UseQueryOptions<SalesRepListResponse, ApiError>
) {
    return useQuery<SalesRepListResponse, ApiError>({
        queryKey: salesKeys.list(filters),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.page) params.append('page', filters.page.toString());
            if (filters.limit) params.append('limit', filters.limit.toString());
            if (filters.territory) params.append('territory', filters.territory);
            if (filters.status) params.append('status', filters.status);

            // Using CRM endpoint as primary based on controller analysis
            const { data } = await apiClient.get<{ data: SalesRepListResponse }>(`/crm/sales-reps?${params.toString()}`);
            return data.data;
        },
        ...options,
    });
}

export function useSalesRepDetail(
    id: string,
    options?: UseQueryOptions<SalesRep, ApiError>
) {
    return useQuery<SalesRep, ApiError>({
        queryKey: salesKeys.detail(id),
        queryFn: async () => {
            const { data } = await apiClient.get<{ data: SalesRep }>(`/crm/sales-reps/${id}`);
            return data.data;
        },
        enabled: !!id,
        ...options,
    });
}

export function useSalesRepCreate(
    options?: UseMutationOptions<SalesRep, ApiError, CreateSalesRepPayload>
) {
    const queryClient = useQueryClient();

    return useMutation<SalesRep, ApiError, CreateSalesRepPayload>({
        mutationFn: async (payload) => {
            const { data } = await apiClient.post<{ data: SalesRep }>('/crm/sales-reps', payload);
            return data.data;
        },
        onSuccess: (data, variables, context) => {
            queryClient.invalidateQueries({ queryKey: salesKeys.lists() });
            showSuccessToast('Sales representative added successfully');
            (options?.onSuccess as any)?.(data, variables, context);
        },
        ...options,
    });
}

export function useSalesRepUpdate(
    id: string,
    options?: UseMutationOptions<SalesRep, ApiError, UpdateSalesRepPayload>
) {
    const queryClient = useQueryClient();

    return useMutation<SalesRep, ApiError, UpdateSalesRepPayload>({
        mutationFn: async (payload) => {
            const { data } = await apiClient.put<{ data: SalesRep }>(`/crm/sales-reps/${id}`, payload);
            return data.data;
        },
        onSuccess: (data, variables, context) => {
            queryClient.invalidateQueries({ queryKey: salesKeys.lists() });
            queryClient.invalidateQueries({ queryKey: salesKeys.detail(id) });
            // Don't show generic toast here, customizable in component
            (options?.onSuccess as any)?.(data, variables, context);
        },
        ...options,
    });
}

export function useSalesRepPerformance(
    id: string,
    options?: UseQueryOptions<SalesRepPerformance, ApiError>
) {
    return useQuery<SalesRepPerformance, ApiError>({
        queryKey: salesKeys.performance(id),
        queryFn: async () => {
            const { data } = await apiClient.get<{ data: SalesRepPerformance }>(`/crm/sales-reps/${id}/performance`);
            return data.data;
        },
        enabled: !!id,
        ...options,
    });
}
