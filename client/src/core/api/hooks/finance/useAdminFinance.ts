import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '../../http';
import { ApiError } from '../../http';

// Types
export interface AdminTransaction {
    _id: string;
    companyId: {
        _id: string;
        name: string;
        email?: string;
        phone?: string;
    };
    type: 'credit' | 'debit';
    amount: number;
    reason: string;
    balance: number;
    description?: string;
    metadata?: any;
    createdAt: string;
    updatedAt: string;
}

export interface AdminWallet {
    _id: string;
    companyId: {
        _id: string;
        name: string;
        email?: string;
        phone?: string;
    };
    balance: number;
    lowBalanceThreshold: number;
    autoRecharge?: {
        enabled: boolean;
        threshold?: number;
        amount?: number;
    };
    createdAt: string;
    updatedAt: string;
}

export interface AdminTransactionsParams {
    page?: number;
    limit?: number;
    companyId?: string;
    type?: 'credit' | 'debit';
    reason?: string;
    startDate?: string;
    endDate?: string;
}

export interface AdminWalletsParams {
    page?: number;
    limit?: number;
    lowBalance?: boolean;
}

export interface AdminTransactionsResponse {
    data: AdminTransaction[];
    pagination: {
        page: number;
        pages: number;
        total: number;
        limit: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

export interface AdminWalletsResponse {
    data: AdminWallet[];
    pagination: {
        page: number;
        pages: number;
        total: number;
        limit: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

/**
 * Fetch all transactions (Admin view)
 */
export const useAdminTransactions = (
    params?: AdminTransactionsParams,
    options?: Omit<UseQueryOptions<AdminTransactionsResponse, ApiError>, 'queryKey' | 'queryFn'>
) => {
    return useQuery<AdminTransactionsResponse, ApiError>({
        queryKey: ['admin', 'finance', 'transactions', params],
        queryFn: async () => {
            const response = await apiClient.get('/admin/finance/transactions', { params });
            return response.data;
        },
        ...options,
    });
};

/**
 * Fetch all wallets (Admin view)
 */
export const useAdminWallets = (
    params?: AdminWalletsParams,
    options?: Omit<UseQueryOptions<AdminWalletsResponse, ApiError>, 'queryKey' | 'queryFn'>
) => {
    return useQuery<AdminWalletsResponse, ApiError>({
        queryKey: ['admin', 'finance', 'wallets', params],
        queryFn: async () => {
            const response = await apiClient.get('/admin/finance/wallets', { params });
            return response.data;
        },
        ...options,
    });
};

/**
 * Fetch specific company wallet (Admin view)
 */
export const useAdminWallet = (
    companyId: string,
    options?: Omit<UseQueryOptions<{ wallet: AdminWallet; recentTransactions: AdminTransaction[] }, ApiError>, 'queryKey' | 'queryFn'>
) => {
    return useQuery<{ wallet: AdminWallet; recentTransactions: AdminTransaction[] }, ApiError>({
        queryKey: ['admin', 'finance', 'wallets', companyId],
        queryFn: async () => {
            const response = await apiClient.get(`/admin/finance/wallets/${companyId}`);
            return response.data.data;
        },
        enabled: !!companyId,
        ...options,
    });
};

/**
 * Fetch finance statistics (Admin view)
 */
export const useAdminFinanceStats = (
    params?: { startDate?: string; endDate?: string },
    options?: Omit<UseQueryOptions<any, ApiError>, 'queryKey' | 'queryFn'>
) => {
    return useQuery<any, ApiError>({
        queryKey: ['admin', 'finance', 'stats', params],
        queryFn: async () => {
            const response = await apiClient.get('/admin/finance/stats', { params });
            return response.data.data;
        },
        ...options,
    });
};

export default {
    useAdminTransactions,
    useAdminWallets,
    useAdminWallet,
    useAdminFinanceStats,
};
