import { apiClient, ApiError } from '@/src/core/api/http';

export interface BillingStats {
    totalRevenue: number;
    pendingRecharges: number;
    failedTransactions: number;
    activeWallets: number;
}

export interface BillingTransaction {
    _id: string;
    companyId: string;
    companyName: string;
    type: 'credit' | 'debit';
    category: 'recharge' | 'label_generation' | 'adjustment' | 'refund';
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    description: string;
    referenceId?: string;
    status: 'success' | 'pending' | 'failed';
    createdAt: string;
}

export interface TransactionFilters {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
}

export const billingApi = {
    /**
     * Get billing overview stats
     */
    getOverview: async (): Promise<BillingStats> => {
        const response = await apiClient.get('/finance/billing/overview');
        return response.data;
    },

    /**
     * Get all transactions with filters
     */
    getAllTransactions: async (params?: TransactionFilters): Promise<{ transactions: BillingTransaction[]; total: number; pages: number }> => {
        const response = await apiClient.get('/finance/billing/transactions', { params });
        return response.data;
    },

    /**
     * Get pending recharge requests
     */
    getPendingRecharges: async (): Promise<BillingTransaction[]> => {
        const response = await apiClient.get('/finance/billing/recharges/pending');
        return response.data;
    },

    /**
     * Approve a recharge request
     */
    approveRecharge: async (transactionId: string): Promise<void> => {
        await apiClient.post(`/admin/billing/recharges/${transactionId}/approve`);
    },

    /**
     * Reject a recharge request
     */
    rejectRecharge: async (transactionId: string, reason: string): Promise<void> => {
        await apiClient.post(`/admin/billing/recharges/${transactionId}/reject`, { reason });
    }
};
