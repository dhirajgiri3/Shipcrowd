/**
 * Weight Discrepancy Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { weightApi, WeightDiscrepancyFilter } from '@/src/core/api/clients/shipping/weightApi';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import { ApiError } from '../../http';

/**
 * Get weight discrepancies list
 */
export const useWeightDiscrepancies = (filters?: WeightDiscrepancyFilter) => {
    return useQuery({
        queryKey: queryKeys.weightDiscrepancy.list(filters as any),
        queryFn: async () => await weightApi.getDiscrepancies(filters),
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
    });
};

/**
 * Accept discrepancy
 */
export const useAcceptDiscrepancy = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => await weightApi.acceptDiscrepancy(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.weightDiscrepancy.all() });
            showSuccessToast('Discrepancy accepted successfully');
        },
        onError: (error: ApiError) => {
            handleApiError(error, 'Failed to accept discrepancy');
        },
    });
};

/**
 * Dispute discrepancy
 */
export const useDisputeDiscrepancy = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, reason, proofFiles }: { id: string; reason: string; proofFiles?: string[] }) =>
            await weightApi.disputeDiscrepancy(id, { reason, proofFiles }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.weightDiscrepancy.all() });
            showSuccessToast('Dispute submitted successfully');
        },
        onError: (error: ApiError) => {
            handleApiError(error, 'Failed to submit dispute');
        },
    });
};
