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
    selectionMode: 'manual_with_recommendation' | 'manual_only' | 'auto';
    autoPriority: 'price' | 'speed' | 'balanced';
    balancedDeltaPercent: number;
    isActive: boolean;
}

export const useSellerCourierPolicy = (sellerId: string, options?: UseQueryOptions<SellerCourierPolicy, ApiError>) => {
    return useQuery<SellerCourierPolicy, ApiError>({
        queryKey: queryKeys.sellerCourierPolicy.detail(sellerId),
        queryFn: async () => {
            const response = await apiClient.get(`/admin/sellers/${sellerId}/courier-policy`);
            return response.data.data || response.data;
        },
        enabled: !!sellerId,
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        refetchOnWindowFocus: false, // Don't refetch when user switches tabs
        refetchOnReconnect: true,    // Do refetch after network restore
        ...options,
    });
};

export const useUpdateSellerCourierPolicy = (
    options?: UseMutationOptions<
        SellerCourierPolicy,
        ApiError,
        { sellerId: string; data: Partial<SellerCourierPolicy> },
        { previousPolicy: SellerCourierPolicy | undefined } // Context type
    >
) => {
    const queryClient = useQueryClient();
    return useMutation<
        SellerCourierPolicy,
        ApiError,
        { sellerId: string; data: Partial<SellerCourierPolicy> },
        { previousPolicy: SellerCourierPolicy | undefined } // Context type
    >({
        mutationFn: async ({ sellerId, data }) => {
            const response = await apiClient.put(`/admin/sellers/${sellerId}/courier-policy`, data);
            return response.data.data || response.data;
        },
        // Optimistic update for instant UI feedback
        onMutate: async ({ sellerId, data }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: queryKeys.sellerCourierPolicy.detail(sellerId) });

            // Snapshot current value for rollback
            const previousPolicy = queryClient.getQueryData<SellerCourierPolicy>(
                queryKeys.sellerCourierPolicy.detail(sellerId)
            );

            // Optimistically update the cache
            queryClient.setQueryData<SellerCourierPolicy>(
                queryKeys.sellerCourierPolicy.detail(sellerId),
                (old) => (old ? { ...old, ...data } : old) as SellerCourierPolicy
            );

            return { previousPolicy };
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.sellerCourierPolicy.detail(variables.sellerId) });
            showSuccessToast('Seller courier policy updated');
        },
        onError: (error, variables, context) => {
            // Rollback optimistic update on error
            if (context?.previousPolicy) {
                queryClient.setQueryData(
                    queryKeys.sellerCourierPolicy.detail(variables.sellerId),
                    context.previousPolicy
                );
            }
            handleApiError(error);
        },
        ...options,
    });
};
