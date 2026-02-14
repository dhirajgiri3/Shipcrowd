/**
 * Wallet API Hooks
 * 
 * React Query hooks for wallet balance, transactions, and recharge operations
 * Includes optimistic updates for immediate UI feedback
 * Uses centralized walletApi client
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { walletApi } from '@/src/core/api/clients/finance/walletApi';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { createOptimisticUpdateHandler } from '../../lib/optimistic-updates';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import { useAuth } from '@/src/features/auth/hooks/useAuth';

// ==================== Import Centralized Types ====================
import type {
    WalletBalance,
    WalletTransactionResponse,
    WalletStats,
    TransactionFilters,
    RechargeInitResponse,
    RechargeWalletPayload,
    RechargeWalletResponse,
} from '@/src/types/api/finance';

// ==================== Hooks ====================

/**
 * Get wallet balance with short cache time.
 * Only runs when user has company context (seller/staff with companyId, or admin with companyId).
 */
export const useWalletBalance = (options?: Omit<UseQueryOptions<WalletBalance>, 'queryKey' | 'queryFn'>) => {
    const { isInitialized, user } = useAuth();
    const hasCompanyContext = isInitialized && !!user?.companyId;
    const { enabled: optionsEnabled, ...restOptions } = options ?? {};

    return useQuery<WalletBalance>({
        queryKey: queryKeys.wallet.balance(),
        queryFn: () => walletApi.getBalance(),
        enabled: hasCompanyContext && (optionsEnabled !== false),
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        refetchOnWindowFocus: true,
        ...restOptions,
    });
};

/**
 * Get wallet transactions with filters and pagination
 */
export const useWalletTransactions = (
    filters?: TransactionFilters,
    options?: Omit<UseQueryOptions<WalletTransactionResponse>, 'queryKey' | 'queryFn'>
) => {
    return useQuery<WalletTransactionResponse>({
        queryKey: queryKeys.wallet.transactions(filters),
        queryFn: () => walletApi.getTransactions(filters),
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        placeholderData: (previousData) => previousData,
        ...options,
    });
};

/**
 * Initialize wallet recharge order before opening Razorpay checkout
 */
export const useInitWalletRecharge = (
    options?: UseMutationOptions<RechargeInitResponse, Error, { amount: number; promoCode?: string }>
) => {
    return useMutation<RechargeInitResponse, Error, { amount: number; promoCode?: string }>({
        mutationFn: (data: { amount: number; promoCode?: string }) => walletApi.initRecharge(data),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Recharge wallet with optimistic update
 */
export const useRechargeWallet = (
    options?: UseMutationOptions<RechargeWalletResponse, Error, RechargeWalletPayload>
) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: RechargeWalletPayload) => walletApi.rechargeWallet(data),
        ...createOptimisticUpdateHandler({
            queryClient,
            queryKey: queryKeys.wallet.balance(),
            updateFn: (oldData: WalletBalance) => ({
                ...oldData,
                balance: oldData.balance, // Optimistic update could add amount here if desired
            }),
        }),
        onSuccess: (data, variables, context) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.wallet.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() });
            showSuccessToast('Wallet recharged successfully');
            // @ts-ignore - Type definition expects 4 args (context mismatch)
            options?.onSuccess?.(data, variables, context, undefined);
        },
        onError: (error, variables, context) => {
            handleApiError(error, 'Recharge Failed');
            // @ts-ignore - Type definition expects 4 args (context mismatch)
            options?.onError?.(error, variables, context, undefined);
        },
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Get wallet statistics
 */
export const useWalletStats = (
    dateRange?: { startDate?: string; endDate?: string },
    options?: Omit<UseQueryOptions<WalletStats>, 'queryKey' | 'queryFn'>
) => {
    return useQuery<WalletStats>({
        queryKey: queryKeys.wallet.stats(dateRange),
        queryFn: () => walletApi.getStats(dateRange),
        ...CACHE_TIMES.LONG,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};
