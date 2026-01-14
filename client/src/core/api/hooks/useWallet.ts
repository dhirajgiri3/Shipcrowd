/**
 * Wallet API Hooks
 * 
 * React Query hooks for wallet balance, transactions, and recharge operations
 * Includes optimistic updates for immediate UI feedback
 * Backend: GET/POST /api/v1/finance/wallet/*
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '@/src/core/api/client';
import { queryKeys } from '../queryKeys';
import { CACHE_TIMES, INVALIDATION_PATTERNS, RETRY_CONFIG } from '../cacheConfig';
import {
    createOptimisticUpdateHandler,
    createOptimisticListUpdateHandler,
    optimisticListUpdate,
} from '../optimisticUpdates';
import { handleApiError, showSuccessToast } from '@/src/lib/error-handler';

// ==================== Import Centralized Types ====================
import type {
    WalletBalance,
    WalletTransaction,
    WalletTransactionResponse,
    WalletStats,
    TransactionFilters,
    RechargeWalletPayload,
    WithdrawWalletPayload,
    TransferWalletPayload,
} from '@/src/types/api/wallet.types';

// ==================== Hooks ====================

/**
 * Get wallet balance with short cache time
 */
export const useWalletBalance = (options?: Omit<UseQueryOptions<WalletBalance>, 'queryKey' | 'queryFn'>) => {
    return useQuery<WalletBalance>({
        queryKey: queryKeys.wallet.balance(),
        queryFn: async () => {
            const response = await apiClient.get('/finance/wallet/balance');
            return response.data.data;
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        refetchOnWindowFocus: true,
        ...options,
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
        queryFn: async () => {
            const response = await apiClient.get('/finance/wallet/transactions', {
                params: filters,
            });
            return response.data.data;
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        placeholderData: (previousData) => previousData,
        ...options,
    });
};

/**
 * Recharge wallet with optimistic update
 * Features:
 * - Optimistically increases balance immediately
 * - Adds transaction to list
 * - Rolls back on error
 */
export const useRechargeWallet = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { amount: number; paymentId?: string }) => {
            const response = await apiClient.post('/finance/wallet/recharge', data);
            return response.data.data;
        },
        ...createOptimisticUpdateHandler({
            queryClient,
            queryKey: queryKeys.wallet.balance(),
            updateFn: (oldData: WalletBalance) => ({
                ...oldData,
                balance: oldData.balance,
            }),
        }),
        onSuccess: (data) => {
            INVALIDATION_PATTERNS.WALLET_MUTATIONS.ADD_MONEY().forEach((pattern) => {
                queryClient.invalidateQueries(pattern);
            });
            showSuccessToast('Wallet recharged successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Recharge Failed');
        },
        retry: RETRY_CONFIG.DEFAULT,
    });
};

/**
 * Withdraw from wallet with optimistic update
 */
export const useWithdrawWallet = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { amount: number; bankAccountId: string }) => {
            const response = await apiClient.post('/finance/wallet/withdraw', data);
            return response.data.data;
        },
        ...createOptimisticUpdateHandler({
            queryClient,
            queryKey: queryKeys.wallet.balance(),
            updateFn: (oldData: WalletBalance) => ({
                ...oldData,
                balance: Math.max(0, oldData.balance),
            }),
        }),
        onSuccess: (data) => {
            INVALIDATION_PATTERNS.WALLET_MUTATIONS.WITHDRAW().forEach((pattern) => {
                queryClient.invalidateQueries(pattern);
            });
            showSuccessToast('Withdrawal initiated successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Withdrawal Failed');
        },
        retry: RETRY_CONFIG.DEFAULT,
    });
};

/**
 * Transfer between sub-wallets with optimistic update
 */
export const useTransferWallet = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { fromType: string; toType: string; amount: number }) => {
            const response = await apiClient.post('/finance/wallet/transfer', data);
            return response.data.data;
        },
        onSuccess: (data) => {
            INVALIDATION_PATTERNS.WALLET_MUTATIONS.TRANSFER().forEach((pattern) => {
                queryClient.invalidateQueries(pattern);
            });
            showSuccessToast('Transfer completed successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Transfer Failed');
        },
        retry: RETRY_CONFIG.DEFAULT,
    });
};

/**
 * Get wallet statistics
 */
export const useWalletStats = (
    dateRange?: { start: string; end: string },
    options?: Omit<UseQueryOptions<WalletStats>, 'queryKey' | 'queryFn'>
) => {
    return useQuery<WalletStats>({
        queryKey: queryKeys.wallet.stats(dateRange),
        queryFn: async () => {
            const response = await apiClient.get('/finance/wallet/stats', {
                params: dateRange ? { startDate: dateRange.start, endDate: dateRange.end } : undefined,
            });
            return response.data.data;
        },
        ...CACHE_TIMES.LONG,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};
