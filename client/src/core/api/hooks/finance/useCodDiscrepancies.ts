/**
 * COD Discrepancy API Hooks
 * React Query hooks for COD discrepancy management.
 */

import {
    useQuery,
    useMutation,
    useQueryClient,
    UseQueryResult,
    UseMutationResult,
    UseMutationOptions,
} from '@tanstack/react-query';
import { ApiError } from '../../http';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import {
    codDiscrepancyApi,
    CODDiscrepancy,
    ResolveDiscrepancyParams,
} from '@/src/core/api/clients/finance/codDiscrepancyApi';

export interface DiscrepancyFilters {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    search?: string;
}

export interface DiscrepancyListResponse {
    data: CODDiscrepancy[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

/**
 * Fetch COD discrepancies with filters
 */
export function useCodDiscrepancies(
    filters: DiscrepancyFilters = {},
    options?: { enabled?: boolean }
): UseQueryResult<DiscrepancyListResponse, ApiError> {
    const { enabled = true, ...restOptions } = options ?? {};

    return useQuery<DiscrepancyListResponse, ApiError>({
        queryKey: queryKeys.cod.discrepancies(filters),
        queryFn: () =>
            codDiscrepancyApi.getDiscrepancies({
                page: filters.page ?? 1,
                limit: filters.limit ?? 10,
                status: filters.status || undefined,
                type: filters.type || undefined,
                search: filters.search || undefined,
            }),
        enabled,
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...restOptions,
    });
}

/**
 * Fetch COD discrepancy counts by status (for stats cards)
 */
export function useCodDiscrepancyStats(): {
    total: number;
    detected: number;
    under_review: number;
    resolved: number;
    isLoading: boolean;
} {
    const all = useCodDiscrepancies({ page: 1, limit: 1 }, { enabled: true });
    const detected = useCodDiscrepancies({ page: 1, limit: 1, status: 'detected' }, { enabled: true });
    const underReview = useCodDiscrepancies({ page: 1, limit: 1, status: 'under_review' }, { enabled: true });
    const resolved = useCodDiscrepancies({ page: 1, limit: 1, status: 'resolved' }, { enabled: true });

    return {
        total: all.data?.pagination?.total ?? 0,
        detected: detected.data?.pagination?.total ?? 0,
        under_review: underReview.data?.pagination?.total ?? 0,
        resolved: resolved.data?.pagination?.total ?? 0,
        isLoading: all.isLoading || detected.isLoading || underReview.isLoading || resolved.isLoading,
    };
}

/**
 * Resolve a COD discrepancy
 */
export function useResolveCodDiscrepancy(
    options?: UseMutationOptions<void, ApiError, { id: string; params: ResolveDiscrepancyParams }>
): UseMutationResult<void, ApiError, { id: string; params: ResolveDiscrepancyParams }> {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, { id: string; params: ResolveDiscrepancyParams }>({
        mutationFn: async ({ id, params }) => {
            await codDiscrepancyApi.resolveDiscrepancy(id, params);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cod', 'discrepancies'] });
            showSuccessToast('Discrepancy resolved successfully');
        },
        onError: (error) => handleApiError(error, 'Failed to resolve discrepancy'),
        retry: false,
        ...options,
    });
}
