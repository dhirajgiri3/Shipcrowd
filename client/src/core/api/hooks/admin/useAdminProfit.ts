/**
 * Admin Profit Hooks
 * Hooks for profit tracking and management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profitApi, ProfitFilters } from '../../clients/profitApi';
import { queryKeys } from '../../config/query-keys';
import { QUERY_CONFIG } from '../../config/query-client';

/**
 * Hook to fetch profit data with filters
 */
export const useProfitData = (filters?: ProfitFilters) => {
    return useQuery({
        queryKey: queryKeys.admin.profit.data(filters),
        queryFn: () => profitApi.getProfitData(filters),
        staleTime: QUERY_CONFIG.staleTime.default,
    });
};

/**
 * Hook to import profit data
 */
export const useImportProfitData = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (file: File) => profitApi.importData(file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.profit.all() });
        }
    });
};

/**
 * Hook to fetch import history
 */
export const useImportHistory = () => {
    return useQuery({
        queryKey: queryKeys.admin.profit.history(),
        queryFn: () => profitApi.getImportHistory()
    });
};

/**
 * Hook to export profit data
 */
export const useExportProfitData = () => {
    return useMutation({
        mutationFn: (filters: ProfitFilters & { format: 'csv' | 'xlsx' }) =>
            profitApi.exportData(filters)
    });
};
