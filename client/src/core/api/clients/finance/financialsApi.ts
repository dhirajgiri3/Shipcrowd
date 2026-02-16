/**
 * Financials API Service
 * Handles admin financial overview and transactions
 */

import { apiClient } from '@/src/core/api/http';

// Types
export interface FinancialOverview {
    availableBalance: number;
    totalSpent: number;
    pendingRemittance: number;
    currency: string;
}

export interface Transaction {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'credit' | 'debit';
    status: 'success' | 'pending' | 'failed';
    reference?: string;
    sellerId?: string;
    sellerName?: string;
}

export interface FinancialsFilters {
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    type?: 'credit' | 'debit';
    status?: string;
    page?: number;
    limit?: number;
}

export interface TransactionsResponse {
    data: Transaction[];
    total: number;
    pages: number;
}

class FinancialsApiService {
    /**
     * Get financial overview stats
     */
    async getOverview(): Promise<FinancialOverview> {
        const response = await apiClient.get('/admin/finance/stats');
        const payload = response.data?.data || response.data || {};
        const walletStats = payload.wallets || {};
        const txStats: Array<{ _id: string; totalAmount: number }> = payload.transactions || [];

        const totalSpent = txStats
            .filter((item) => item?._id === 'debit')
            .reduce((sum, item) => sum + Number(item?.totalAmount || 0), 0);

        return {
            availableBalance: Number(walletStats.totalBalance || 0),
            totalSpent,
            pendingRemittance: 0,
            currency: 'INR',
        };
    }

    /**
     * Get recent transactions with filters
     */
    async getTransactions(filters?: FinancialsFilters): Promise<TransactionsResponse> {
        const response = await apiClient.get('/admin/finance/transactions', { params: filters });
        const payload = response.data || {};
        const list = Array.isArray(payload.data) ? payload.data : [];
        const pagination = payload.pagination || {};

        return {
            data: list.map((item: any) => ({
                id: String(item._id),
                date: item.createdAt,
                description: item.description || item.reason || item.type || 'Transaction',
                amount: Number(item.amount || 0),
                type: (item.type || 'debit') as 'credit' | 'debit',
                status: 'success' as const,
                reference: item.reference || item.transactionId,
                sellerId: item.company?._id ? String(item.company._id) : undefined,
                sellerName: item.company?.name,
            })),
            total: Number(pagination.total || list.length || 0),
            pages: Number(pagination.pages || 1),
        };
    }
}

export const financialsApi = new FinancialsApiService();
export default financialsApi;
