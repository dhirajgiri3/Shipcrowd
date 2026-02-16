import { useState } from 'react';
import { useMutation, useQuery, useQueryClient, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/src/core/api/http';
import { queryKeys, FilterParams } from '@/src/core/api/config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '@/src/core/api/config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

// NOTE: Backend uses response helpers like sendSuccess/sendPaginated:
// - sendSuccess(res, data) => { success: true, data }
// - sendPaginated(res, data, pagination) => { success: true, data: [...], pagination }

interface PaginatedResult<T> {
    data: T[];
    pagination?: {
        currentPage?: number;
        totalPages?: number;
        totalItems?: number;
        limit?: number;
    };
}

export interface CommissionRule {
    _id: string;
    name: string;
    ruleType: string;
    isActive: boolean;
    effectiveFrom?: string;
    effectiveTo?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface SalesRepresentative {
    _id: string;
    name?: string;
    email?: string;
    status?: string;
    role?: string;
    territories?: string[];
    createdAt?: string;
    updatedAt?: string;
}

export interface CommissionPayout {
    _id: string;
    status: string;
    amount?: number;
    currency?: string;
    createdAt?: string;
    updatedAt?: string;
}

// ===================== Rules =====================

export function useCommissionRules(
    filters?: FilterParams & { ruleType?: string; isActive?: boolean; effectiveFrom?: string; effectiveTo?: string },
    options?: UseQueryOptions<PaginatedResult<CommissionRule>, ApiError>
) {
    return useQuery<PaginatedResult<CommissionRule>, ApiError>({
        queryKey: queryKeys.commission.rules(filters),
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: CommissionRule[]; pagination?: any }>(
                '/commission/rules',
                { params: filters }
            );
            return { data: data.data, pagination: data.pagination };
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useCommissionRule(
    id: string,
    options?: UseQueryOptions<CommissionRule, ApiError>
) {
    return useQuery<CommissionRule, ApiError>({
        queryKey: queryKeys.commission.rule(id),
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: CommissionRule }>(`/commission/rules/${id}`);
            return data.data;
        },
        enabled: !!id,
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useCreateCommissionRule(
    options?: UseMutationOptions<CommissionRule, ApiError, Record<string, any>>
) {
    const queryClient = useQueryClient();

    return useMutation<CommissionRule, ApiError, Record<string, any>>({
        mutationFn: async (payload) => {
            const { data } = await apiClient.post<{ success: boolean; data: CommissionRule }>(
                '/commission/rules',
                payload
            );
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.commission.all() });
            showSuccessToast('Commission rule created successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useUpdateCommissionRule(
    options?: UseMutationOptions<CommissionRule, ApiError, { id: string; data: Record<string, any> }>
) {
    const queryClient = useQueryClient();

    return useMutation<CommissionRule, ApiError, { id: string; data: Record<string, any> }>({
        mutationFn: async ({ id, data: payload }) => {
            const { data } = await apiClient.put<{ success: boolean; data: CommissionRule }>(
                `/commission/rules/${id}`,
                payload
            );
            return data.data;
        },
        onSuccess: (_rule, vars) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.commission.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.commission.rule(vars.id) });
            showSuccessToast('Commission rule updated successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useDeleteCommissionRule(
    options?: UseMutationOptions<void, ApiError, string>
) {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, string>({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/commission/rules/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.commission.all() });
            showSuccessToast('Commission rule deleted successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

// ===================== Sales Reps =====================

export function useSalesReps(
    filters?: FilterParams & { status?: string; role?: string; territory?: string },
    options?: UseQueryOptions<PaginatedResult<SalesRepresentative>, ApiError>
) {
    return useQuery<PaginatedResult<SalesRepresentative>, ApiError>({
        queryKey: queryKeys.commission.salesReps(filters),
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: SalesRepresentative[]; pagination?: any }>(
                '/commission/sales-reps',
                { params: filters }
            );
            return { data: data.data, pagination: data.pagination };
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useSalesRep(
    id: string,
    options?: UseQueryOptions<SalesRepresentative, ApiError>
) {
    return useQuery<SalesRepresentative, ApiError>({
        queryKey: queryKeys.commission.salesRep(id),
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: SalesRepresentative }>(
                `/commission/sales-reps/${id}`
            );
            return data.data;
        },
        enabled: !!id,
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useCreateSalesRep(
    options?: UseMutationOptions<SalesRepresentative, ApiError, Record<string, any>>
) {
    const queryClient = useQueryClient();

    return useMutation<SalesRepresentative, ApiError, Record<string, any>>({
        mutationFn: async (payload) => {
            const { data } = await apiClient.post<{ success: boolean; data: SalesRepresentative }>(
                '/commission/sales-reps',
                payload
            );
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.commission.all() });
            showSuccessToast('Sales representative created successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useUpdateSalesRep(
    options?: UseMutationOptions<SalesRepresentative, ApiError, { id: string; data: Record<string, any> }>
) {
    const queryClient = useQueryClient();

    return useMutation<SalesRepresentative, ApiError, { id: string; data: Record<string, any> }>({
        mutationFn: async ({ id, data: payload }) => {
            const { data } = await apiClient.put<{ success: boolean; data: SalesRepresentative }>(
                `/commission/sales-reps/${id}`,
                payload
            );
            return data.data;
        },
        onSuccess: (_rep, vars) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.commission.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.commission.salesRep(vars.id) });
            showSuccessToast('Sales representative updated successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useDeleteSalesRep(
    options?: UseMutationOptions<void, ApiError, string>
) {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, string>({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/commission/sales-reps/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.commission.all() });
            showSuccessToast('Sales representative deactivated successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

// ===================== Payouts =====================

export function useCommissionPayouts(
    filters?: FilterParams,
    options?: UseQueryOptions<PaginatedResult<CommissionPayout>, ApiError>
) {
    return useQuery<PaginatedResult<CommissionPayout>, ApiError>({
        queryKey: queryKeys.commission.payouts(filters),
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: CommissionPayout[]; pagination?: any }>(
                '/commission/payouts',
                { params: filters }
            );
            return { data: data.data, pagination: data.pagination };
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useCommissionPayout(
    id: string,
    options?: UseQueryOptions<CommissionPayout, ApiError>
) {
    return useQuery<CommissionPayout, ApiError>({
        queryKey: queryKeys.commission.payout(id),
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: CommissionPayout }>(
                `/commission/payouts/${id}`
            );
            return data.data;
        },
        enabled: !!id,
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useInitiateCommissionPayout(
    options?: UseMutationOptions<CommissionPayout, ApiError, Record<string, any>>
) {
    const queryClient = useQueryClient();

    return useMutation<CommissionPayout, ApiError, Record<string, any>>({
        mutationFn: async (payload) => {
            const { data } = await apiClient.post<{ success: boolean; data: CommissionPayout }>(
                '/commission/payouts',
                payload
            );
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.commission.all() });
            showSuccessToast('Payout initiated successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}
// ===================== Transactions =====================

// We need to define the CommissionTransaction interface based on the backend model
export interface CommissionTransaction {
    _id: string;
    // Add other fields as needed based on ICommissionTransaction
    status: 'pending' | 'approved' | 'rejected' | 'paid';
    amount: number;
    finalAmount: number;
    salesRepresentative: SalesRepresentative;
    // ... other fields
    createdAt: string;
}

export function useCommissionTransactions(
    filters?: FilterParams & { status?: string; salesRepId?: string; startDate?: string; endDate?: string },
    options?: UseQueryOptions<PaginatedResult<CommissionTransaction>, ApiError>
) {
    return useQuery<PaginatedResult<CommissionTransaction>, ApiError>({
        queryKey: queryKeys.commission.transactions(filters),
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: CommissionTransaction[]; pagination?: any }>(
                '/admin/commission/transactions',
                { params: filters }
            );
            return { data: data.data, pagination: data.pagination };
        },
        ...CACHE_TIMES.SHORT, // Transactions change frequently
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useBulkApproveTransactions(
    options?: UseMutationOptions<any, ApiError, { transactionIds: string[] }>
) {
    const queryClient = useQueryClient();

    return useMutation<any, ApiError, { transactionIds: string[] }>({
        mutationFn: async (payload) => {
            const { data } = await apiClient.post<{ success: boolean; data: any }>(
                '/admin/commission/transactions/bulk-approve',
                payload
            );
            return data.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.commission.all() });
            showSuccessToast(`Bulk approve completed: ${data.success} succeeded, ${data.failed} failed`);
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useBulkRejectTransactions(
    options?: UseMutationOptions<any, ApiError, { transactionIds: string[]; reason: string }>
) {
    const queryClient = useQueryClient();

    return useMutation<any, ApiError, { transactionIds: string[]; reason: string }>({
        mutationFn: async (payload) => {
            const { data } = await apiClient.post<{ success: boolean; data: any }>(
                '/admin/commission/transactions/bulk-reject',
                payload
            );
            return data.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.commission.all() });
            showSuccessToast(`Bulk reject completed: ${data.success} succeeded, ${data.failed} failed`);
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

// ===================== Page Controller =====================

export function useCommissionPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('pending');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    const queryFilters = {
        status: statusFilter === 'all' ? undefined : statusFilter,
        // Add search logic if backend supports it based on searchQuery, e.g. search: searchQuery
    };

    const { data, isLoading, isError, error } = useCommissionTransactions(queryFilters);
    const { mutate: bulkApprove, isPending: isApproving } = useBulkApproveTransactions();
    const { mutate: bulkReject, isPending: isRejecting } = useBulkRejectTransactions();

    const transactions = data?.data || [];
    const allIds = transactions.map(t => t._id);
    const areAllSelected = transactions.length > 0 && selectedIds.size === transactions.length;

    const toggleSelectAll = () => {
        if (areAllSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(allIds));
        }
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleBulkApprove = () => {
        if (selectedIds.size === 0) return;
        bulkApprove({ transactionIds: Array.from(selectedIds) }, {
            onSuccess: () => setSelectedIds(new Set())
        });
    };

    const handleBulkReject = () => {
        if (selectedIds.size === 0) return;
        bulkReject({ transactionIds: Array.from(selectedIds), reason: rejectionReason }, {
            onSuccess: () => {
                setSelectedIds(new Set());
                setIsRejectDialogOpen(false);
                setRejectionReason('');
            }
        });
    };

    return {
        // State
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        selectedIds,
        setSelectedIds,
        isRejectDialogOpen,
        setIsRejectDialogOpen,
        rejectionReason,
        setRejectionReason,

        // Data
        transactions,
        isLoading,
        isError,
        error,

        // Computed
        areAllSelected,
        isApproving,
        isRejecting,

        // Actions
        toggleSelectAll,
        toggleSelect,
        handleBulkApprove,
        handleBulkReject,

    };
}
