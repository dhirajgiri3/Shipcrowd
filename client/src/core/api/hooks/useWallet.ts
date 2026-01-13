/**
 * Wallet API Hooks
 * 
 * React Query hooks for wallet balance, transactions, and recharge operations
 * Backend: GET/POST /api/v1/finance/wallet/*
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '@/src/core/api/client';

// ==================== TypeScript Types ====================
// Types match backend WalletTransaction model and controller responses

export interface WalletBalance {
    balance: number;
    currency?: string;
    lastUpdated?: Date;
}

export interface WalletTransaction {
    _id: string;
    company: string;
    type: 'credit' | 'debit';
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    reason: 'recharge' | 'shipping_cost' | 'rto_charge' | 'cod_remittance' | 'refund' | 'other';
    description: string;
    reference?: {
        type: string;
        id?: string;
        externalId?: string;
    };
    status: 'completed' | 'pending' | 'failed';
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
}

export interface TransactionFilters {
    type?: 'credit' | 'debit';
    reason?: 'recharge' | 'shipping_cost' | 'rto_charge' | 'cod_remittance' | 'refund' | 'other';
    startDate?: string; // YYYY-MM-DD
    endDate?: string;   // YYYY-MM-DD
    page?: number;
    limit?: number;
}

// Backend returns paginated response via sendPaginated helper
export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export interface WalletTransactionResponse {
    transactions: WalletTransaction[];
    pagination: PaginationMeta;
}

export interface WalletStats {
    totalCredits: number;
    totalDebits: number;
    netFlow: number;
    transactionCount: number;
    averageTransaction: number;
}

// ==================== Query Keys ====================

export const walletKeys = {
    all: ['wallet'] as const,
    balance: () => [...walletKeys.all, 'balance'] as const,
    transactions: (filters?: TransactionFilters) => [...walletKeys.all, 'transactions', filters] as const,
    stats: (dateRange?: { start: string; end: string }) => [...walletKeys.all, 'stats', dateRange] as const,
};

// ==================== Hooks ====================

/**
 * Get wallet balance
 * GET /finance/wallet/balance
 * Backend returns: { success: true, data: { balance: number }, message: string }
 */
export const useWalletBalance = (options?: Omit<UseQueryOptions<WalletBalance>, 'queryKey' | 'queryFn'>) => {
    return useQuery<WalletBalance>({
        queryKey: walletKeys.balance(),
        queryFn: async () => {
            const response = await apiClient.get('/finance/wallet/balance');
            // Backend uses sendSuccess(res, data, message) format
            return response.data.data;
        },
        staleTime: 30000, // 30 seconds
        refetchOnWindowFocus: true,
        ...options,
    });
};

/**
 * Get wallet transactions with filters
 * GET /finance/wallet/transactions?page=1&limit=10&type=credit&reason=recharge
 * Backend returns: { success: true, data: {transactions, pagination}, message: string }
 */
export const useWalletTransactions = (
    filters?: TransactionFilters,
    options?: Omit<UseQueryOptions<WalletTransactionResponse>, 'queryKey' | 'queryFn'>
) => {
    return useQuery<WalletTransactionResponse>({
        queryKey: walletKeys.transactions(filters),
        queryFn: async () => {
            const response = await apiClient.get('/finance/wallet/transactions', {
                params: filters,
            });
            // Backend uses sendPaginated(res, data, pagination, message)
            return response.data.data;
        },
        staleTime: 60000, // 1 minute
        placeholderData: (previousData) => previousData,
        ...options,
    });
};

/**
 * Recharge wallet
 * POST /finance/wallet/recharge
 * Body: { amount: number, paymentId?: string }
 * Backend returns: { success: true, data: { transactionId, newBalance }, message: string }
 */
export const useRechargeWallet = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { amount: number; paymentId?: string }) => {
            const response = await apiClient.post('/finance/wallet/recharge', data);
            return response.data.data;
        },
        onSuccess: () => {
            // Invalidate to refetch fresh data
            queryClient.invalidateQueries({ queryKey: walletKeys.balance() });
            queryClient.invalidateQueries({ queryKey: walletKeys.transactions() });
            queryClient.invalidateQueries({ queryKey: walletKeys.stats() });
        },
    });
};

/**
 * Get wallet statistics
 * GET /finance/wallet/stats?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Backend returns: { success: true, data: { stats }, message: string }
 */
export const useWalletStats = (
    dateRange?: { start: string; end: string },
    options?: Omit<UseQueryOptions<WalletStats>, 'queryKey' | 'queryFn'>
) => {
    return useQuery<WalletStats>({
        queryKey: walletKeys.stats(dateRange),
        queryFn: async () => {
            const response = await apiClient.get('/finance/wallet/stats', {
                params: dateRange ? { startDate: dateRange.start, endDate: dateRange.end } : undefined,
            });
            return response.data.data;
        },
        staleTime: 120000, // 2 minutes
        ...options,
    });
};
