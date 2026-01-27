/**
 * Admin Billing Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billingApi, TransactionFilters } from '../../clients/billingApi';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import { ApiError } from '../../http';

/**
 * Get billing overview stats
 */
export const useAdminBillingOverview = () => {
    return useQuery({
        queryKey: queryKeys.admin.billing.overview(),
        queryFn: async () => await billingApi.getOverview(),
        ...CACHE_TIMES.MEDIUM,
    });
};

/**
 * Get billing transactions
 */
export const useAdminTransactions = (filters?: TransactionFilters) => {
    return useQuery({
        queryKey: queryKeys.admin.billing.transactions(filters),
        queryFn: async () => await billingApi.getAllTransactions(filters),
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
    });
};

/**
 * Get pending recharges
 */
export const useAdminPendingRecharges = () => {
    return useQuery({
        queryKey: ['admin', 'billing', 'recharges', 'pending'], // TODO: Add to query-keys
        queryFn: async () => await billingApi.getPendingRecharges(),
        ...CACHE_TIMES.SHORT,
        refetchInterval: 30000, // Poll every 30s
    });
};

/**
 * Approve recharge
 */
export const useAdminApproveRecharge = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (transactionId: string) =>
            await billingApi.approveRecharge(transactionId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'billing'] });
            showSuccessToast('Recharge approved successfully');
        },
        onError: (error: ApiError) => {
            handleApiError(error, 'Failed to approve recharge');
        },
    });
};

/**
 * Reject recharge
 */
export const useAdminRejectRecharge = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ transactionId, reason }: { transactionId: string; reason: string }) =>
            await billingApi.rejectRecharge(transactionId, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'billing'] });
            showSuccessToast('Recharge rejected');
        },
        onError: (error: ApiError) => {
            handleApiError(error, 'Failed to reject recharge');
        },
    });
};
