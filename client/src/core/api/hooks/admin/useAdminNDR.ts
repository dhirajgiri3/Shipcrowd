/**
 * Admin NDR Hooks
 * Hooks for NDR management and analytics
 */

import { useQuery } from '@tanstack/react-query';
import { ndrApi, NdrFilters } from '../../clients/shipping/ndrApi';
import { queryKeys } from '../../config/query-keys';
import { QUERY_CONFIG } from '../../config/query-client';
import { RETRY_CONFIG } from '../../config/cache.config';

/**
 * Hook to fetch admin NDR list
 */
export const useAdminNDRList = (filters?: NdrFilters) => {
    return useQuery({
        queryKey: queryKeys.ndr.list(filters),
        queryFn: () => ndrApi.getAdminNDRList(filters),
        staleTime: QUERY_CONFIG.staleTime.default,
        retry: RETRY_CONFIG.DEFAULT,
    });
};

/**
 * Hook to fetch NDR funnel data
 */
export const useNdrFunnel = (filters?: NdrFilters) => {
    return useQuery({
        queryKey: queryKeys.ndr.funnel(filters),
        queryFn: () => ndrApi.getFunnel(filters),
        staleTime: QUERY_CONFIG.staleTime.analytics,
        retry: RETRY_CONFIG.DEFAULT,
    });
};
