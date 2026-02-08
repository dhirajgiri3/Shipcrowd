import { useMutation, useQuery, useQueryClient, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/src/core/api/http';
import { queryKeys } from '@/src/core/api/config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '@/src/core/api/config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

export interface CarrierBillingImportRecord {
    shipmentId?: string;
    provider: 'velocity' | 'delhivery' | 'ekart';
    awb: string;
    invoiceRef?: string;
    remittanceRef?: string;
    billedTotal: number;
    billedComponents?: Record<string, number>;
    source?: 'api' | 'webhook' | 'mis' | 'manual';
    billedAt?: string;
    rawProviderPayload?: unknown;
}

export interface PricingVarianceCaseItem {
    _id: string;
    awb: string;
    provider: 'velocity' | 'delhivery' | 'ekart';
    expectedCost: number;
    billedCost: number;
    varianceAmount: number;
    variancePercent: number;
    thresholdPercent: number;
    status: 'open' | 'under_review' | 'resolved' | 'waived';
    resolution?: {
        outcome?: string;
        adjustedCost?: number;
        refundAmount?: number;
        notes?: string;
    };
    createdAt: string;
}

interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
        totalPages?: number;
    };
}

export const usePricingVarianceCases = (
    filters?: Record<string, unknown>,
    options?: UseQueryOptions<PaginatedResponse<PricingVarianceCaseItem>, ApiError>
) => {
    return useQuery<PaginatedResponse<PricingVarianceCaseItem>, ApiError>({
        queryKey: queryKeys.finance.pricingVarianceCases(filters),
        queryFn: async () => {
            const response = await apiClient.get('/finance/pricing-variance-cases', { params: filters });
            const pagination = response.data.pagination || {};
            const page = Number(pagination.page ?? filters?.page ?? 1);
            const limit = Number(pagination.limit ?? filters?.limit ?? 20);
            const pages = Number(pagination.pages ?? pagination.totalPages ?? 0);
            return {
                data: response.data.data || [],
                pagination: {
                    total: Number(pagination.total ?? 0),
                    page,
                    limit,
                    pages,
                    totalPages: Number(pagination.totalPages ?? pages),
                },
            };
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

export const useImportCarrierBilling = (
    options?: UseMutationOptions<any, ApiError, { records: CarrierBillingImportRecord[]; thresholdPercent?: number }>
) => {
    const queryClient = useQueryClient();

    return useMutation<any, ApiError, { records: CarrierBillingImportRecord[]; thresholdPercent?: number }>({
        mutationFn: async ({ records, thresholdPercent }) => {
            const response = await apiClient.post('/finance/carrier-billing/import', { records, thresholdPercent });
            return response.data.data || response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.finance.pricingVarianceCases() });
            showSuccessToast('Carrier billing imported successfully');
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
};

export const useUpdatePricingVarianceCase = (
    options?: UseMutationOptions<PricingVarianceCaseItem, ApiError, {
        id: string;
        status: 'open' | 'under_review' | 'resolved' | 'waived';
        resolution?: {
            outcome?: string;
            adjustedCost?: number;
            refundAmount?: number;
            notes?: string;
        };
    }>
) => {
    const queryClient = useQueryClient();

    return useMutation<PricingVarianceCaseItem, ApiError, {
        id: string;
        status: 'open' | 'under_review' | 'resolved' | 'waived';
        resolution?: {
            outcome?: string;
            adjustedCost?: number;
            refundAmount?: number;
            notes?: string;
        };
    }>({
        mutationFn: async ({ id, ...payload }) => {
            const response = await apiClient.patch(`/finance/pricing-variance-cases/${id}`, payload);
            return response.data.data || response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.finance.pricingVarianceCases() });
            showSuccessToast('Pricing variance case updated');
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
};
