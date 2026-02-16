import { useMutation, useQuery, useQueryClient, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/src/core/api/http';
import { queryKeys } from '@/src/core/api/config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '@/src/core/api/config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

export interface SellerCourierPolicy {
    sellerId: string;
    allowedProviders: string[];
    allowedServiceIds: string[];
    blockedProviders: string[];
    blockedServiceIds: string[];
    rateCardType: 'default' | 'custom';
    rateCardCategory: 'default' | 'basic' | 'standard' | 'advanced' | 'custom';
    selectionMode: 'manual_with_recommendation' | 'manual_only' | 'auto';
    autoPriority: 'price' | 'speed' | 'balanced';
    balancedDeltaPercent: number;
    isActive: boolean;
}

type SellerCourierPolicyScope = 'admin' | 'seller';

const getSellerCourierPolicyPath = (sellerId: string, scope: SellerCourierPolicyScope): string =>
    scope === 'admin'
        ? `/admin/sellers/${sellerId}/courier-policy`
        : `/sellers/${sellerId}/courier-policy`;

export const useSellerCourierPolicy = (
    sellerId: string,
    options?: Omit<UseQueryOptions<SellerCourierPolicy, ApiError>, 'queryKey' | 'queryFn'> & {
        scope?: SellerCourierPolicyScope;
    }
) => {
    const scope = options?.scope || 'admin';
    return useQuery<SellerCourierPolicy, ApiError>({
        queryKey: [...queryKeys.sellerCourierPolicy.detail(sellerId), scope],
        queryFn: async () => {
            const response = await apiClient.get(getSellerCourierPolicyPath(sellerId, scope));
            return response.data.data || response.data;
        },
        enabled: !!sellerId,
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        refetchOnWindowFocus: false, // Don't refetch when user switches tabs
        refetchOnReconnect: true,    // Do refetch after network restore
        ...(() => {
            const { scope: _scope, ...rest } = options || {};
            return rest;
        })(),
    });
};

export const useUpdateSellerCourierPolicy = (
    options?: UseMutationOptions<
        SellerCourierPolicy,
        ApiError,
        { sellerId: string; data: Partial<SellerCourierPolicy>; scope?: SellerCourierPolicyScope },
        { previousPolicy: SellerCourierPolicy | undefined } // Context type
    >
) => {
    const queryClient = useQueryClient();
    return useMutation<
        SellerCourierPolicy,
        ApiError,
        { sellerId: string; data: Partial<SellerCourierPolicy>; scope?: SellerCourierPolicyScope },
        { previousPolicy: SellerCourierPolicy | undefined } // Context type
    >({
        mutationFn: async ({ sellerId, data, scope = 'admin' }) => {
            const response = await apiClient.put(getSellerCourierPolicyPath(sellerId, scope), data);
            return response.data.data || response.data;
        },
        // Optimistic update for instant UI feedback
        onMutate: async ({ sellerId, data, scope = 'admin' }) => {
            const key = [...queryKeys.sellerCourierPolicy.detail(sellerId), scope];
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: key });

            // Snapshot current value for rollback
            const previousPolicy = queryClient.getQueryData<SellerCourierPolicy>(
                key
            );

            // Optimistically update the cache
            queryClient.setQueryData<SellerCourierPolicy>(
                key,
                (old) => (old ? { ...old, ...data } : old) as SellerCourierPolicy
            );

            return { previousPolicy };
        },
        onSuccess: (_, variables) => {
            const key = [...queryKeys.sellerCourierPolicy.detail(variables.sellerId), variables.scope || 'admin'];
            queryClient.invalidateQueries({ queryKey: key });
            showSuccessToast('Seller courier policy updated');
        },
        onError: (error, variables, context) => {
            const key = [...queryKeys.sellerCourierPolicy.detail(variables.sellerId), variables.scope || 'admin'];
            // Rollback optimistic update on error
            if (context?.previousPolicy) {
                queryClient.setQueryData(
                    key,
                    context.previousPolicy
                );
            }
            handleApiError(error);
        },
        ...options,
    });
};
