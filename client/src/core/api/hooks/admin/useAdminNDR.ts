/**
 * Admin NDR Hooks
 * Hooks for NDR management and analytics
 */

import { useQuery } from '@tanstack/react-query';
import { ndrApi, NdrFilters } from '../../clients/ndrApi';
import { queryKeys } from '../../config/query-keys';
import { QUERY_CONFIG } from '../../config/query-client';

/**
 * Hook to fetch admin NDR list
 */
export const useAdminNDRList = (filters?: NdrFilters) => {
    return useQuery({
        queryKey: queryKeys.ndr.list(filters),
        queryFn: () => ndrApi.getAdminNDRList(filters),
        staleTime: QUERY_CONFIG.staleTime.default,
    });
};

/**
 * Hook to fetch NDR funnel data
 */
export const useNdrFunnel = (filters?: NdrFilters) => {
    return useQuery({
        queryKey: queryKeys.ndr.analytics(filters as any),
        queryFn: () => ndrApi.getFunnel(filters),
        staleTime: QUERY_CONFIG.staleTime.analytics,
    });
};
