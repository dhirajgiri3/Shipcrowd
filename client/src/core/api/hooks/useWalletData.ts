/**
 * Wallet Data Hooks
 *
 * React Query hooks for wallet-related API calls with mock data fallback
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { USE_MOCK_DATA } from '@/src/config/features';
import { apiClient } from '../client';

// Mock data imports
import { mockTransactions } from '@/src/lib/mockData/enhanced';
import { Truck, Package, CreditCard } from 'lucide-react';

// ==================== Types ====================

export interface WalletBalance {
    balance: number;
    currency: string;
    lowBalanceThreshold?: number;
}

export interface SpendCategory {
    name: string;
    amount: number;
    percentage: number;
}

export interface WalletInsights {
    thisWeek: {
        total: number;
        categories: SpendCategory[];
    };
    lastWeek: {
        total: number;
        categories: SpendCategory[];
    };
    avgOrderCost: number;
    recommendations: string[];
}

export interface WalletTrends {
    weeklyChange: number;
    averageWeeklySpend: number;
    projectedWeeksRemaining: number;
    projectedOrdersRemaining: number;
}

export interface APITransaction {
    _id: string;
    amount: number;
    type: 'credit' | 'debit';
    reason: string;
    balanceAfter: number;
    createdAt: string;
    status: 'pending' | 'completed' | 'failed';
    description?: string;
    referenceId?: string;
}

// ==================== Mock Data ====================

const MOCK_BALANCE: WalletBalance = {
    balance: 45820,
    currency: 'INR',
    lowBalanceThreshold: 10000
};

const MOCK_INSIGHTS: WalletInsights = {
    thisWeek: {
        total: 8450,
        categories: [
            { name: 'Shipping Costs', amount: 6200, percentage: 73 },
            { name: 'Packaging', amount: 1450, percentage: 17 },
            { name: 'Transaction Fees', amount: 800, percentage: 10 }
        ]
    },
    lastWeek: {
        total: 7200,
        categories: [
            { name: 'Shipping Costs', amount: 5100, percentage: 71 },
            { name: 'Packaging', amount: 1300, percentage: 18 },
            { name: 'Transaction Fees', amount: 800, percentage: 11 }
        ]
    },
    avgOrderCost: 385,
    recommendations: [
        'Switch to Blue Dart for Mumbai deliveries to save ₹45/order',
        'Bulk order packaging materials to save 15% on material costs',
        'Enable auto-recharge at ₹10,000 to avoid payment failures'
    ]
};

const MOCK_TRENDS: WalletTrends = {
    weeklyChange: -12,
    averageWeeklySpend: 8450,
    projectedWeeksRemaining: 5.4,
    projectedOrdersRemaining: 119
};

// ==================== API Functions ====================

const fetchWalletBalance = async (): Promise<WalletBalance> => {
    if (USE_MOCK_DATA) {
        return new Promise((resolve) => setTimeout(() => resolve(MOCK_BALANCE), 500));
    }

    const response = await apiClient.get<{ data: WalletBalance }>('/finance/wallet/balance');
    return response.data.data;
};

const fetchWalletInsights = async (): Promise<WalletInsights> => {
    if (USE_MOCK_DATA) {
        return new Promise((resolve) => setTimeout(() => resolve(MOCK_INSIGHTS), 800));
    }

    const response = await apiClient.get<{ data: WalletInsights }>('/finance/wallet/insights');
    return response.data.data;
};

const fetchWalletTrends = async (): Promise<WalletTrends> => {
    if (USE_MOCK_DATA) {
        return new Promise((resolve) => setTimeout(() => resolve(MOCK_TRENDS), 600));
    }

    const response = await apiClient.get<{ data: WalletTrends }>('/finance/wallet/trends');
    return response.data.data;
};

const fetchTransactions = async (params?: {
    page?: number;
    limit?: number;
    type?: 'credit' | 'debit';
}): Promise<{ transactions: APITransaction[]; total: number }> => {
    if (USE_MOCK_DATA) {
        const { page = 1, limit = 10 } = params || {};
        const start = (page - 1) * limit;
        const end = start + limit;

        return new Promise((resolve) =>
            setTimeout(
                () =>
                    resolve({
                        transactions: mockTransactions.slice(start, end) as any,
                        total: mockTransactions.length
                    }),
                700
            )
        );
    }

    const response = await apiClient.get<{
        data: APITransaction[];
        pagination: { total: number };
    }>('/finance/wallet/transactions', { params });

    return {
        transactions: response.data.data,
        total: response.data.pagination.total
    };
};

const rechargeWallet = async (data: { amount: number; paymentId: string }) => {
    if (USE_MOCK_DATA) {
        return new Promise((resolve) =>
            setTimeout(
                () =>
                    resolve({
                        transactionId: `mock-txn-${Date.now()}`,
                        newBalance: MOCK_BALANCE.balance + data.amount
                    }),
                2000
            )
        );
    }

    const response = await apiClient.post('/finance/wallet/recharge', data);
    return response.data.data;
};

// ==================== Hooks ====================

export function useWalletBalance() {
    return useQuery({
        queryKey: ['wallet', 'balance'],
        queryFn: fetchWalletBalance,
        staleTime: 30000, // 30 seconds
        refetchInterval: 60000 // Refetch every minute
    });
}

export function useWalletInsights() {
    return useQuery({
        queryKey: ['wallet', 'insights'],
        queryFn: fetchWalletInsights,
        staleTime: 300000, // 5 minutes
        refetchOnWindowFocus: false
    });
}

export function useWalletTrends() {
    return useQuery({
        queryKey: ['wallet', 'trends'],
        queryFn: fetchWalletTrends,
        staleTime: 300000, // 5 minutes
        refetchOnWindowFocus: false
    });
}

export function useTransactions(params?: { page?: number; limit?: number; type?: 'credit' | 'debit' }) {
    return useQuery<{ transactions: APITransaction[]; total: number }>({
        queryKey: ['wallet', 'transactions', params],
        queryFn: () => fetchTransactions(params),
        staleTime: 60000 // 1 minute
    });
}

export function useRechargeWallet() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: rechargeWallet,
        onSuccess: () => {
            // Invalidate and refetch wallet data
            queryClient.invalidateQueries({ queryKey: ['wallet'] });
        }
    });
}
