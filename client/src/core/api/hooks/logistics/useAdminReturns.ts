import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError } from '@/src/lib/error';
import { toast } from 'sonner';

export const adminReturnKeys = {
    all: () => ['admin', 'returns'] as const,
    lists: () => [...adminReturnKeys.all(), 'list'] as const,
    list: (filters: string) => [...adminReturnKeys.lists(), { filters }] as const,
    details: () => [...adminReturnKeys.all(), 'detail'] as const,
    detail: (id: string) => [...adminReturnKeys.details(), id] as const,
    stats: () => [...adminReturnKeys.all(), 'stats'] as const,
};

export interface AdminReturnFilters {
    page?: number;
    limit?: number;
    search?: string;
    companyId?: string;
    status?: string;
    returnReason?: string;
}

export interface AdminReturn {
    _id: string;
    returnId: string;
    orderId: string;
    shipmentId: string;
    status: string;
    returnReason: string;
    refundAmount: number;
    customerName: string;
    companyName: string;
    reason: string;
    pickup: {
        status?: string;
        scheduledDate?: string;
        awb?: string;
    };
    qc: {
        status?: string;
        result?: string;
    };
    refund: {
        status?: string;
    };
    sla: {
        isBreached?: boolean;
    };
    createdAt: string;
    updatedAt: string;
}

export interface AdminReturnStats {
    total: number;
    requested: number;
    qcPending: number;
    totalRefundAmount: number;
}

export interface AdminReturnDetail extends AdminReturn {
    returnReasonText?: string;
    customerComments?: string;
    items: any[];
    refundMethod?: string;
    timeline: any[];
    inventory?: any;
}

/**
 * Hook to fetch all returns for admin (across all companies)
 */
export const useAdminReturns = (
    filters: AdminReturnFilters = {},
    options?: UseQueryOptions<AdminReturn[], ApiError>
) => {
    return useQuery<AdminReturn[], ApiError>({
        queryKey: adminReturnKeys.list(JSON.stringify(filters)),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.page) params.append('page', filters.page.toString());
            if (filters.limit) params.append('limit', filters.limit.toString());
            if (filters.search) params.append('search', filters.search);
            if (filters.companyId) params.append('companyId', filters.companyId);
            if (filters.status) params.append('status', filters.status);
            if (filters.returnReason) params.append('returnReason', filters.returnReason);

            const response = await apiClient.get(`/admin/returns?${params.toString()}`);
            // Handle both paginated structure and direct array
            return response.data.data || response.data.returns || [];
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        placeholderData: (previousData) => previousData ?? [],
        ...options,
    });
};

/**
 * Hook to fetch return statistics for admin dashboard
 */
export const useAdminReturnStats = (
    companyId?: string,
    options?: UseQueryOptions<AdminReturnStats, ApiError>
) => {
    return useQuery<AdminReturnStats, ApiError>({
        queryKey: adminReturnKeys.stats(),
        queryFn: async () => {
            const params = companyId ? `?companyId=${companyId}` : '';
            const response = await apiClient.get(`/admin/returns/stats${params}`);
            return response.data.data || response.data;
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Hook to fetch a single return detail for admin
 */
export const useAdminReturn = (
    id: string,
    options?: UseQueryOptions<AdminReturnDetail, ApiError>
) => {
    return useQuery<AdminReturnDetail, ApiError>({
        queryKey: adminReturnKeys.detail(id),
        queryFn: async () => {
            const response = await apiClient.get(`/admin/returns/${id}`);
            return response.data.data?.return || response.data.return;
        },
        enabled: !!id,
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Hook to update return status (Admin)
 */
export const useAdminUpdateReturnStatus = () => {
    const queryClient = useQueryClient();

    return useMutation<AdminReturn, ApiError, { id: string; status: string; notes?: string }>({
        mutationFn: async ({ id, status, notes }) => {
            const response = await apiClient.patch(`/admin/returns/${id}/status`, { status, notes });
            return response.data.data?.return || response.data.return;
        },
        onSuccess: (updatedReturn) => {
            toast.success('Return status updated successfully');
            queryClient.invalidateQueries({ queryKey: adminReturnKeys.lists() });
            queryClient.invalidateQueries({ queryKey: adminReturnKeys.stats() });
            if (updatedReturn._id) {
                queryClient.setQueryData(adminReturnKeys.detail(updatedReturn._id), updatedReturn);
            }
        },
        onError: (error) => {
            handleApiError(error);
        },
    });
};

/**
 * Hook to process refund (Admin)
 */
export const useAdminProcessRefund = () => {
    const queryClient = useQueryClient();

    return useMutation<any, ApiError, string>({
        mutationFn: async (returnId) => {
            const response = await apiClient.post(`/admin/returns/${returnId}/refund`);
            return response.data.data || response.data;
        },
        onSuccess: () => {
            toast.success('Refund processed successfully');
            queryClient.invalidateQueries({ queryKey: adminReturnKeys.lists() });
            queryClient.invalidateQueries({ queryKey: adminReturnKeys.stats() });
        },
        onError: (error) => {
            handleApiError(error);
        },
    });
};
