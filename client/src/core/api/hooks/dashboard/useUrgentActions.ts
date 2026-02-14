import { useQueries } from '@tanstack/react-query';
import { ndrApi } from '../../clients/shipping/ndrApi';
import { apiClient } from '../../http';
import { useAuth } from '@/src/features/auth';

interface UrgentActionsData {
    pendingPickupCount: number;
    rtoCount: number;
    ndrActionRequiredCount: number;
    isLoading: boolean;
    isError: boolean;
}

/**
 * Hook to fetch counts for urgent actions (Needs Attention)
 * Uses parallel queries with limit=1 for shipments and dedicated stat endpoint for NDR.
 * Queries are only run when user has a company (avoids 500s for admin without company).
 */
export const useUrgentActions = (): UrgentActionsData => {
    const { user, isInitialized } = useAuth();
    const hasCompanyContext = isInitialized && !!user?.companyId;

    // We run three parallel queries (only when user has company context):
    // 1. Pending Pickups (shipment status=pending)
    // 2. RTO Shipments (shipment status=rto)
    // 3. NDR Stats (action_required)
    const results = useQueries({
        queries: [
            {
                queryKey: ['shipments', 'count', 'pending'],
                queryFn: async () => {
                    const response = await apiClient.get('/shipments', {
                        params: {
                            page: 1,
                            limit: 1,
                            status: 'pending',
                        },
                    });
                    return response.data;
                },
                staleTime: 60 * 1000,
                enabled: hasCompanyContext,
            },
            {
                queryKey: ['shipments', 'count', 'rto'],
                queryFn: async () => {
                    const response = await apiClient.get('/shipments', {
                        params: {
                            page: 1,
                            limit: 1,
                            status: 'rto',
                        },
                    });
                    return response.data;
                },
                staleTime: 60 * 1000,
                enabled: hasCompanyContext,
            },
            {
                queryKey: ['ndr', 'stats'],
                queryFn: async () => await ndrApi.getStats(),
                staleTime: 60 * 1000,
                enabled: hasCompanyContext,
            }
        ]
    });

    const pendingPickupQuery = results[0];
    const rtoQuery = results[1];
    const ndrQuery = results[2];

    const isLoading = hasCompanyContext && (pendingPickupQuery.isLoading || rtoQuery.isLoading || ndrQuery.isLoading);
    const isError = pendingPickupQuery.isError || rtoQuery.isError || ndrQuery.isError;

    const pendingPickupCount = pendingPickupQuery.data?.pagination?.total ?? 0;
    const rtoCount = rtoQuery.data?.pagination?.total ?? 0;
    const ndrActionRequiredCount = (ndrQuery.data as any)?.actionRequired ?? 0;

    return {
        pendingPickupCount,
        rtoCount,
        ndrActionRequiredCount,
        isLoading,
        isError
    };
};
