
import { apiClient } from '@/src/core/api/http';
import { PromoCode, PromoCodeResponse, PromoCodeFilters } from '@/src/types/domain/promotion';

const BASE_URL = '/promos';

export const promotionApi = {
    /**
     * Get all promo codes with optional filters
     */
    getAll: async (params?: PromoCodeFilters) => {
        const response = await apiClient.get<{ data: PromoCodeResponse }>(BASE_URL, { params });
        return response.data.data;
    },

    /**
     * Create a new promo code
     */
    create: async (data: Partial<PromoCode>) => {
        const response = await apiClient.post<{ data: { promoCode: PromoCode } }>(BASE_URL, data);
        return response.data.data.promoCode;
    },

    /**
     * Update an existing promo code
     */
    update: async (id: string, data: Partial<PromoCode>) => {
        const response = await apiClient.patch<{ data: { promoCode: PromoCode } }>(`${BASE_URL}/${id}`, data);
        return response.data.data.promoCode;
    },

    /**
     * Delete a promo code
     */
    delete: async (id: string) => {
        await apiClient.delete(`${BASE_URL}/${id}`);
    }
};
