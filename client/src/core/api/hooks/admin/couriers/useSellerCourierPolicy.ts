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
            const response = await apiClient.get(`/sellers/${sellerId}/courier-policy`);
            return response.data.data || response.data;
        },
        enabled: !!sellerId,
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

export const useUpdateSellerCourierPolicy = (
    options?: UseMutationOptions<SellerCourierPolicy, ApiError, { sellerId: string; data: Partial<SellerCourierPolicy> }>
) => {
    const queryClient = useQueryClient();
    return useMutation<SellerCourierPolicy, ApiError, { sellerId: string; data: Partial<SellerCourierPolicy> }>({
        mutationFn: async ({ sellerId, data }) => {
            const response = await apiClient.put(`/sellers/${sellerId}/courier-policy`, data);
            return response.data.data || response.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.sellerCourierPolicy.detail(variables.sellerId) });
            showSuccessToast('Seller courier policy updated');
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
};
