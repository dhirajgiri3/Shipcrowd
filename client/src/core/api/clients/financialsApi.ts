/**
 * Financials API Service
 * Handles admin financial overview and transactions
 */

import { apiClient } from '../http';

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
        const response = await apiClient.get('/admin/financials/overview');
        return response.data;
    }

    /**
     * Get recent transactions with filters
     */
    async getTransactions(filters?: FinancialsFilters): Promise<TransactionsResponse> {
        const response = await apiClient.get('/admin/financials/transactions', { params: filters });
        return response.data;
    }
}

export const financialsApi = new FinancialsApiService();
export default financialsApi;
