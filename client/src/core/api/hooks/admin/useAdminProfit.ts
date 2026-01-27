/**
 * Admin Profit Hooks
 * Hooks for profit tracking and management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profitApi, ProfitFilters } from '../../clients/profitApi';
import { queryKeys } from '../../config/query-keys';
import { QUERY_CONFIG } from '../../config/query-client';
import { RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import { ApiError } from '../../http';

/**
 * Hook to fetch profit data with filters
 */
export const useProfitData = (filters?: ProfitFilters) => {
    return useQuery({
        queryKey: queryKeys.admin.profit.data(filters),
        queryFn: () => profitApi.getProfitData(filters),
        staleTime: QUERY_CONFIG.staleTime.default,
        retry: RETRY_CONFIG.DEFAULT,
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
            showSuccessToast('Profit data imported successfully');
        },
        onError: (error: ApiError) => {
            handleApiError(error, 'Failed to import profit data');
        },
    });
};

/**
 * Hook to fetch import history
 */
export const useImportHistory = () => {
    return useQuery({
        queryKey: queryKeys.admin.profit.history(),
        queryFn: () => profitApi.getImportHistory(),
        retry: RETRY_CONFIG.DEFAULT,
    });
};

/**
 * Hook to export profit data
 */
export const useExportProfitData = () => {
    return useMutation({
        mutationFn: (filters: ProfitFilters & { format: 'csv' | 'xlsx' }) =>
            profitApi.exportData(filters),
        onSuccess: () => {
            showSuccessToast('Profit data exported successfully');
        },
        onError: (error: ApiError) => {
            handleApiError(error, 'Failed to export profit data');
        },
    });
};
