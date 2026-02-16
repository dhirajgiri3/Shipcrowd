import { apiClient } from '@/src/core/api/http';

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
        const response = await apiClient.get('/admin/finance/stats');
        const payload = response.data?.data || response.data || {};
        const wallets = payload.wallets || {};
        const transactions = Array.isArray(payload.transactions) ? payload.transactions : [];

        const totalCredits = transactions
            .filter((item: { _id?: string; totalAmount?: number }) => item?._id === 'credit')
            .reduce((sum: number, item: { totalAmount?: number }) => sum + Number(item?.totalAmount || 0), 0);
        const totalDebits = transactions
            .filter((item: { _id?: string; totalAmount?: number }) => item?._id === 'debit')
            .reduce((sum: number, item: { totalAmount?: number }) => sum + Number(item?.totalAmount || 0), 0);

        return {
            totalRevenue: totalCredits,
            pendingRecharges: 0,
            failedTransactions: 0,
            activeWallets: Number(wallets.activeWallets || 0),
        };
    },

    /**
     * Get all transactions with filters
     */
    getAllTransactions: async (params?: TransactionFilters): Promise<{ transactions: BillingTransaction[]; total: number; pages: number }> => {
        const response = await apiClient.get('/admin/finance/transactions', { params });
        const payload = response.data || {};
        const rows = Array.isArray(payload.data) ? payload.data : [];
        const pagination = payload.pagination || {};

        return {
            transactions: rows.map((row: any) => ({
                _id: String(row._id),
                companyId: String(row.company?._id || row.companyId?._id || row.companyId || ''),
                companyName: row.company?.name || row.companyId?.name || 'Unknown Company',
                type: row.type === 'credit' ? 'credit' : 'debit',
                category: row.reason === 'recharge' ? 'recharge' : 'adjustment',
                amount: Number(row.amount || 0),
                balanceBefore: 0,
                balanceAfter: Number(row.balance || 0),
                description: row.description || row.reason || 'Transaction',
                referenceId: row.reference || row.referenceId,
                status: 'success',
                createdAt: row.createdAt,
            })),
            total: Number(pagination.total || rows.length || 0),
            pages: Number(pagination.pages || 1),
        };
    },

    /**
     * Get pending recharge requests
     */
    getPendingRecharges: async (): Promise<BillingTransaction[]> => {
        const response = await apiClient.get('/admin/finance/transactions', {
            params: {
                status: 'pending',
                type: 'credit',
            },
        });
        const rows = Array.isArray(response.data?.data) ? response.data.data : [];
        return rows.map((row: any) => ({
            _id: String(row._id),
            companyId: String(row.company?._id || row.companyId?._id || row.companyId || ''),
            companyName: row.company?.name || row.companyId?.name || 'Unknown Company',
            type: row.type === 'credit' ? 'credit' : 'debit',
            category: 'recharge',
            amount: Number(row.amount || 0),
            balanceBefore: 0,
            balanceAfter: Number(row.balance || 0),
            description: row.description || row.reason || 'Pending Recharge',
            referenceId: row.reference || row.referenceId,
            status: row.status === 'pending' ? 'pending' : 'success',
            createdAt: row.createdAt,
        }));
    },

    /**
     * Approve a recharge request
     */
    approveRecharge: async (transactionId: string): Promise<void> => {
        throw new Error(`Approve recharge is not available on current admin finance routes (transactionId: ${transactionId})`);
    },

    /**
     * Reject a recharge request
     */
    rejectRecharge: async (transactionId: string, reason: string): Promise<void> => {
        throw new Error(`Reject recharge is not available on current admin finance routes (transactionId: ${transactionId}, reason: ${reason})`);
    }
};
