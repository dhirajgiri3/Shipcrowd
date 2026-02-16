/**
 * Admin Billing Hooks
 * Consolidated Data & Control Layer
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billingApi, TransactionFilters } from '../../../clients/finance/billingApi'; // Adjust path
import { queryKeys } from '../../../config/query-keys'; // Adjust path
import { CACHE_TIMES, RETRY_CONFIG } from '../../../config/cache.config'; // Adjust path
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import { ApiError } from '../../../http'; // Adjust path
import { useDebouncedValue } from '@/src/hooks/data';
import { useToast } from '@/src/components/ui/feedback/Toast';

// ==========================================
// DATA LAYER (API Hooks)
// ==========================================

export const useAdminBillingOverview = () => {
    return useQuery({
        queryKey: queryKeys.admin.billing.overview(),
        queryFn: async () => await billingApi.getOverview(),
        ...CACHE_TIMES.MEDIUM,
    });
};

export const useAdminBillingTransactions = (filters?: TransactionFilters) => {
    return useQuery({
        queryKey: queryKeys.admin.billing.transactions(filters),
        queryFn: async () => await billingApi.getAllTransactions(filters),
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
    });
};

export const useAdminPendingRecharges = () => {
    return useQuery({
        queryKey: queryKeys.admin.billing.pendingRecharges(),
        queryFn: async () => await billingApi.getPendingRecharges(),
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.NO_RETRY,
        refetchInterval: 60000,
    });
};

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

// ==========================================
// CONTROL LAYER (Page Controller)
// ==========================================

export type BillingTab = 'recharges' | 'manual';
export type BillingStatus = 'all' | 'success' | 'pending' | 'failed';

export function useBillingPage() {
    // UI State
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebouncedValue(searchQuery, 500);
    const [selectedStatus, setSelectedStatus] = useState<BillingStatus>('all');
    const [activeTab, setActiveTab] = useState<BillingTab>('recharges');
    const [showAddManual, setShowAddManual] = useState(false);

    // Manual Entry Form State (Mock)
    const [manualForm, setManualForm] = useState({
        sellerId: '',
        type: 'credit',
        amount: '',
        reason: ''
    });

    const { addToast } = useToast();

    // Data Fetching
    const { data: overviewStats, isLoading: isLoadingStats } = useAdminBillingOverview();

    // Transactions Query
    // We map UI state to API filters
    const transactionFilters: TransactionFilters = {
        search: debouncedSearch,
        status: selectedStatus === 'all' ? undefined : selectedStatus,
        // The API might expect 'recharge' or 'adjustment' depending on the tab
        // Adjusting logic based on tab if needed, or fetching all types if API supports generic search
        type: activeTab === 'manual' ? 'adjustment' : 'recharge',
    };

    const { data: transactionsData, isLoading: isLoadingTransactions } = useAdminBillingTransactions(transactionFilters);

    const transactions = transactionsData?.transactions || [];

    // Handlers
    const handleSearchChange = (value: string) => setSearchQuery(value);
    const handleStatusChange = (status: BillingStatus) => setSelectedStatus(status);
    const handleTabChange = (tab: BillingTab) => setActiveTab(tab);

    const submitManualEntry = () => {
        // MOCK IMPLEMENTATION as requested
        addToast('Manual entry added successfully!', 'success');
        setShowAddManual(false);
        setManualForm({ sellerId: '', type: 'credit', amount: '', reason: '' });
    };

    return {
        // State
        searchQuery,
        selectedStatus,
        activeTab,
        showAddManual,
        setShowAddManual,
        manualForm,
        setManualForm,

        // Data
        overviewStats,
        transactions,
        isLoading: isLoadingStats || isLoadingTransactions,

        // Actions
        handleSearchChange,
        handleStatusChange,
        handleTabChange,
        submitManualEntry,
        addToast // Exposed for convenience like export button
    };
}
