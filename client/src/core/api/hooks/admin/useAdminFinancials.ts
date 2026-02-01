/**
 * Admin Financials Hooks
 * Hooks for financial overview and transaction management
 */

import { useQuery } from '@tanstack/react-query';
import { financialsApi, FinancialsFilters } from '../../clients/financialsApi';
import { queryKeys } from '../../config/query-keys';
import { QUERY_CONFIG } from '../../config/query-client';
import { RETRY_CONFIG } from '../../config/cache.config';

/**
 * Hook to fetch financial overview stats
 */
export const useAdminFinancialsOverview = () => {
    return useQuery({
        queryKey: queryKeys.admin.financials.overview(),
        queryFn: () => financialsApi.getOverview(),
        staleTime: QUERY_CONFIG.staleTime.default,
        retry: RETRY_CONFIG.DEFAULT,
    });
};

/**
 * Hook to fetch transactions with filters
 */
export const useAdminTransactions = (filters?: FinancialsFilters) => {
    return useQuery({
        queryKey: queryKeys.admin.financials.transactions(filters),
        queryFn: () => financialsApi.getTransactions(filters),
        staleTime: QUERY_CONFIG.staleTime.default,
        retry: RETRY_CONFIG.DEFAULT,
    });
};
