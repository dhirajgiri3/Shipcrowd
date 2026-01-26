/**
 * Promo Code API Hooks
 * React Query hooks for promotional code management and validation
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../client';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

export interface PromoCode {
    _id: string;
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    maxDiscount?: number;
    minRecharge?: number;
    usageLimit?: number;
    usedCount: number;
    validFrom: string;
    validTo: string;
    status: 'active' | 'expired' | 'inactive';
    description?: string;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
}

export interface PromoCodeResponse {
    promoCodes: PromoCode[];
    pagination: { page: number; limit: number; total: number; pages: number; };
}

export interface PromoCodeFilters {
    status?: 'active' | 'expired' | 'inactive';
    search?: string;
    page?: number;
    limit?: number;
}

export interface ValidatePromoPayload { code: string; amount: number; }
export interface ValidatePromoResponse { valid: boolean; discount: number; finalAmount: number; message?: string; }

export const usePromoCodes = (filters?: PromoCodeFilters, options?: UseQueryOptions<PromoCodeResponse, ApiError>) => {
    return useQuery<PromoCodeResponse, ApiError>({
        queryKey: queryKeys.marketing.promoCodes(filters),
        queryFn: async () => {
            const response = await apiClient.get<{ data: PromoCodeResponse }>('/marketing/promo-code', { params: filters });
            return response.data.data;
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

export const useValidatePromoCode = (options?: UseMutationOptions<ValidatePromoResponse, ApiError, ValidatePromoPayload>) => {
    return useMutation<ValidatePromoResponse, ApiError, ValidatePromoPayload>({
        mutationFn: async (payload) => {
            const response = await apiClient.post<{ data: ValidatePromoResponse }>('/marketing/promo-code/validate', payload);
            return response.data.data;
        },
        onError: (error) => handleApiError(error, 'Validate Promo Failed'),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

export const useCreatePromoCode = (options?: UseMutationOptions<PromoCode, ApiError, Partial<PromoCode>>) => {
    const queryClient = useQueryClient();
    return useMutation<PromoCode, ApiError, Partial<PromoCode>>({
        mutationFn: async (payload) => {
            const response = await apiClient.post<{ data: { promoCode: PromoCode } }>('/marketing/promo-code', payload);
            return response.data.data.promoCode;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.marketing.all() });
            showSuccessToast('Promo code created successfully');
        },
        onError: (error) => handleApiError(error, 'Create Promo Failed'),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

export const useUpdatePromoCode = (options?: UseMutationOptions<PromoCode, ApiError, { id: string; payload: Partial<PromoCode> }>) => {
    const queryClient = useQueryClient();
    return useMutation<PromoCode, ApiError, { id: string; payload: Partial<PromoCode> }>({
        mutationFn: async ({ id, payload }) => {
            const response = await apiClient.patch<{ data: { promoCode: PromoCode } }>(`/marketing/promo-code/${id}`, payload);
            return response.data.data.promoCode;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.marketing.all() });
            showSuccessToast('Promo code updated successfully');
        },
        onError: (error) => handleApiError(error, 'Update Promo Failed'),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

export const useDeletePromoCode = (options?: UseMutationOptions<void, ApiError, string>) => {
    const queryClient = useQueryClient();
    return useMutation<void, ApiError, string>({
        mutationFn: async (id) => { await apiClient.delete(`/marketing/promo-code/${id}`); },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.marketing.all() });
            showSuccessToast('Promo code deleted successfully');
        },
        onError: (error) => handleApiError(error, 'Delete Promo Failed'),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};
