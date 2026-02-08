/**
 * Admin Rate Card Hooks
 *
 * Platform-wide rate card management hooks for admins.
 * Allows viewing, creating, updating, and managing rate cards across all companies.
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

// Types
export interface AdminRateCard {
    _id: string;
    name: string;
    scope?: 'global' | 'company';
    companyId: {
        _id: string;
        name: string;
        email?: string;
        phone?: string;
    } | string | null;
    status: 'draft' | 'active' | 'inactive' | 'expired';
    version?: string;
    versionNumber?: number;
    fuelSurcharge?: number;
    isLocked?: boolean;
    minimumFare?: number;
    minimumFareCalculatedOn?: 'freight' | 'freight_overhead';
    gst?: number;
    codPercentage?: number;
    codMinimumCharge?: number;
    shipmentType?: 'forward' | 'reverse';
    zoneBType?: 'state' | 'distance';
    rateCardCategory?: string;
    zonePricing?: {
        zoneA?: { baseWeight: number; basePrice: number; additionalPricePerKg: number };
        zoneB?: { baseWeight: number; basePrice: number; additionalPricePerKg: number };
        zoneC?: { baseWeight: number; basePrice: number; additionalPricePerKg: number };
        zoneD?: { baseWeight: number; basePrice: number; additionalPricePerKg: number };
        zoneE?: { baseWeight: number; basePrice: number; additionalPricePerKg: number };
    };
    effectiveDates: {
        startDate: string;
        endDate?: string;
    };
    createdAt: string;
    updatedAt: string;
    isDeleted: boolean;
}

export interface CreateAdminRateCardPayload {
    name: string;
    scope?: 'global' | 'company';
    companyId?: string;
    rateCardCategory?: string;
    shipmentType?: 'forward' | 'reverse';
    gst?: number;
    minimumFare?: number;
    minimumFareCalculatedOn?: 'freight' | 'freight_overhead';
    zoneBType?: 'state' | 'distance';
    codPercentage?: number;
    codMinimumCharge?: number;
    zonePricing?: {
        zoneA?: { baseWeight: number; basePrice: number; additionalPricePerKg: number };
        zoneB?: { baseWeight: number; basePrice: number; additionalPricePerKg: number };
        zoneC?: { baseWeight: number; basePrice: number; additionalPricePerKg: number };
        zoneD?: { baseWeight: number; basePrice: number; additionalPricePerKg: number };
        zoneE?: { baseWeight: number; basePrice: number; additionalPricePerKg: number };
    };
    effectiveDates: {
        startDate: string;
        endDate?: string;
    };
    status?: 'draft' | 'active' | 'inactive';
}

export interface UpdateAdminRateCardPayload extends Partial<CreateAdminRateCardPayload> { }

export interface AdminRateCardStats {
    total: number;
    active: number;
    inactive: number;
    draft: number;
    avgRatePerKg?: number;
    revenue30d?: number;
    topCompanies: Array<{
        companyId: string;
        companyName: string;
        count: number;
    }>;
}

interface AdminRateCardsFilters {
    status?: 'draft' | 'active' | 'inactive' | 'expired';
    companyId?: string;
    scope?: 'global' | 'company';
    search?: string;
    category?: string;
    page?: number;
    limit?: number;
}

/**
 * Get all rate cards (platform-wide)
 * Admin can see rate cards across all companies
 */
export const useAdminRateCards = (
    filters?: AdminRateCardsFilters,
    options?: Partial<UseQueryOptions<{ rateCards: AdminRateCard[]; pagination: any }, ApiError>>
) => {
    return useQuery<{ rateCards: AdminRateCard[]; pagination: any }, ApiError>({
        queryKey: ['admin', 'ratecards', 'list', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters?.status) params.append('status', filters.status);
            if (filters?.companyId) params.append('companyId', filters.companyId);
            if (filters?.scope) params.append('scope', filters.scope);
            if (filters?.search) params.append('search', filters.search);
            if (filters?.category) params.append('category', filters.category);
            if (filters?.page) params.append('page', filters.page.toString());
            if (filters?.limit) params.append('limit', filters.limit.toString());

            const response = await apiClient.get(`/admin/ratecards?${params.toString()}`);
            return {
                rateCards: response.data.data || [],
                pagination: response.data.pagination || {},
            };
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        placeholderData: (previousData) => previousData,
        ...options,
    });
};

/**
 * Get single rate card by ID (any company)
 */
export const useAdminRateCard = (
    rateCardId: string,
    options?: Partial<UseQueryOptions<AdminRateCard, ApiError>>
) => {
    return useQuery<AdminRateCard, ApiError>({
        queryKey: ['admin', 'ratecards', 'detail', rateCardId],
        queryFn: async () => {
            const response = await apiClient.get(`/admin/ratecards/${rateCardId}`);
            return response.data.data.rateCard;
        },
        enabled: !!rateCardId,
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Get platform-wide rate card statistics
 */
export const useAdminRateCardStats = (
    params?: { companyId?: string },
    options?: Partial<UseQueryOptions<AdminRateCardStats, ApiError>>
) => {
    return useQuery<AdminRateCardStats, ApiError>({
        queryKey: ['admin', 'ratecards', 'stats', params],
        queryFn: async () => {
            const query = params?.companyId ? `?companyId=${params.companyId}` : '';
            const response = await apiClient.get(`/admin/ratecards/stats${query}`);
            return response.data.data;
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Create rate card for a specific company
 */
/**
 * Create rate card for a specific company
 */
export const useCreateAdminRateCard = (
    options?: UseMutationOptions<AdminRateCard, ApiError, CreateAdminRateCardPayload>
) => {
    const queryClient = useQueryClient();

    return useMutation<AdminRateCard, ApiError, CreateAdminRateCardPayload>({
        mutationFn: async (data) => {
            const response = await apiClient.post('/admin/ratecards', data);
            return response.data.data.rateCard;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'ratecards'] });
        },
        onError: (error) => {
            handleApiError(error, 'Failed to create rate card');
        },
        ...options,
    });
};

/**
 * Update rate card (any company)
 */
export const useUpdateAdminRateCard = (
    options?: UseMutationOptions<AdminRateCard, ApiError, { id: string; data: UpdateAdminRateCardPayload }>
) => {
    const queryClient = useQueryClient();

    return useMutation<AdminRateCard, ApiError, { id: string; data: UpdateAdminRateCardPayload }>({
        mutationFn: async ({ id, data }) => {
            const response = await apiClient.patch(`/admin/ratecards/${id}`, data);
            return response.data.data.rateCard;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'ratecards'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'ratecards', 'detail', variables.id] });
        },
        onError: (error) => {
            handleApiError(error, 'Failed to update rate card');
        },
        ...options,
    });
};

/**
 * Delete rate card (any company)
 */
export const useDeleteAdminRateCard = (
    options?: UseMutationOptions<{ id: string }, ApiError, string>
) => {
    const queryClient = useQueryClient();

    return useMutation<{ id: string }, ApiError, string>({
        mutationFn: async (rateCardId) => {
            const response = await apiClient.delete(`/admin/ratecards/${rateCardId}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'ratecards'] });
        },
        onError: (error) => {
            handleApiError(error, 'Failed to delete rate card');
        },
        ...options,
    });
};

/**
 * Clone rate card (any company)
 */
export const useCloneAdminRateCard = (
    options?: UseMutationOptions<AdminRateCard, ApiError, string>
) => {
    const queryClient = useQueryClient();

    return useMutation<AdminRateCard, ApiError, string>({
        mutationFn: async (rateCardId) => {
            const response = await apiClient.post(`/admin/ratecards/${rateCardId}/clone`);
            return response.data.data.rateCard;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'ratecards'] });
        },
        onError: (error) => {
            handleApiError(error, 'Failed to clone rate card');
        },
        ...options,
    });
};
