/**
 * Admin Coupons Hooks
 * Centralized hooks for managing coupons/promo-codes in the admin panel
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/src/core/api/http';
import { queryKeys } from '@/src/core/api/config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '@/src/core/api/config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import { PromoCode, PromoCodeResponse, PromoCodeFilters } from '@/src/types/domain/promotion';

/**
 * Get all coupons with optional filtering
 */
export const useAdminCoupons = (filters?: PromoCodeFilters) => {
    return useQuery({
        queryKey: queryKeys.marketing.promoCodes(filters),
        queryFn: async () => {
            const response = await apiClient.get<{ data: PromoCodeResponse }>('/promos', { params: filters });
            return response.data.data;
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
    });
};

/**
 * Create a new coupon
 */
export const useCreateCoupon = () => {
    const queryClient = useQueryClient();
    return useMutation<PromoCode, ApiError, Partial<PromoCode>>({
        mutationFn: async (payload) => {
            const response = await apiClient.post<{ data: { promoCode: PromoCode } }>('/promos', payload);
            return response.data.data.promoCode;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.marketing.all() });
            showSuccessToast('Coupon created successfully');
        },
        onError: (error) => handleApiError(error, 'Failed to create coupon'),
    });
};

/**
 * Update an existing coupon
 */
export const useUpdateCoupon = () => {
    const queryClient = useQueryClient();
    return useMutation<PromoCode, ApiError, { id: string; payload: Partial<PromoCode> }>({
        mutationFn: async ({ id, payload }) => {
            const response = await apiClient.patch<{ data: { promoCode: PromoCode } }>(`/promos/${id}`, payload);
            return response.data.data.promoCode;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.marketing.all() });
            showSuccessToast('Coupon updated successfully');
        },
        onError: (error) => handleApiError(error, 'Failed to update coupon'),
    });
};

/**
 * Delete a coupon
 */
export const useDeleteCoupon = () => {
    const queryClient = useQueryClient();
    return useMutation<void, ApiError, string>({
        mutationFn: async (id) => { await apiClient.delete(`/promos/${id}`); },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.marketing.all() });
            showSuccessToast('Coupon deleted successfully');
        },
        onError: (error) => handleApiError(error, 'Failed to delete coupon'),
    });
};
