import { useMutation, useQuery, useQueryClient, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/src/core/api/http';
import { queryKeys } from '@/src/core/api/config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '@/src/core/api/config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

export interface ServiceRateCardItem {
    _id: string;
    serviceId: string;
    cardType: 'cost' | 'sell';
    flowType?: 'forward' | 'reverse';
    category?: 'default' | 'basic' | 'standard' | 'advanced' | 'custom';
    status: 'draft' | 'active' | 'inactive';
    sourceMode: 'LIVE_API' | 'TABLE' | 'HYBRID';
    currency?: 'INR';
    effectiveDates?: {
        startDate: string | Date;
        endDate?: string | Date;
    };
    calculation?: {
        weightBasis: 'actual' | 'volumetric' | 'max';
        roundingUnitKg: number;
        roundingMode: 'ceil' | 'floor' | 'nearest';
        dimDivisor: number;
    };
    zoneRules: Array<{
        zoneKey: string;
        slabs: Array<{ minKg: number; maxKg: number; charge: number }>;
        additionalPerKg?: number;
        codRule?:
            | {
                  type: 'flat';
                  minCharge: number;
              }
            | {
                  type: 'percentage';
                  percentage: number;
                  minCharge?: number;
                  maxCharge?: number;
              }
            | {
                  type: 'slab';
                  basis?: 'orderValue' | 'codAmount';
                  slabs: Array<{
                      min: number;
                      max: number;
                      value: number;
                      type: 'flat' | 'percentage';
                  }>;
              };
        fuelSurcharge?: {
            percentage?: number;
            base?: 'freight' | 'freight_cod';
        };
        rtoRule?:
            | {
                  type: 'forward_mirror';
              }
            | {
                  type: 'flat';
                  amount: number;
              }
            | {
                  type: 'percentage';
                  percentage: number;
                  minCharge?: number;
                  maxCharge?: number;
              };
    }>;
}

export const useServiceRateCards = (filters?: Record<string, any>, options?: UseQueryOptions<ServiceRateCardItem[], ApiError>) => {
    return useQuery<ServiceRateCardItem[], ApiError>({
        queryKey: queryKeys.serviceRateCards.list(filters),
        queryFn: async () => {
            const response = await apiClient.get('/admin/service-ratecards', { params: filters });
            return response.data.data || [];
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

export const useCreateServiceRateCard = (options?: UseMutationOptions<ServiceRateCardItem, ApiError, Partial<ServiceRateCardItem>>) => {
    const queryClient = useQueryClient();
    return useMutation<ServiceRateCardItem, ApiError, Partial<ServiceRateCardItem>>({
        mutationFn: async (payload) => {
            const response = await apiClient.post('/admin/service-ratecards', payload);
            return response.data.data || response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.serviceRateCards.all() });
            showSuccessToast('Service rate card created');
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
};

export const useUpdateServiceRateCard = (
    options?: UseMutationOptions<ServiceRateCardItem, ApiError, { id: string; data: Partial<ServiceRateCardItem> }>
) => {
    const queryClient = useQueryClient();
    return useMutation<ServiceRateCardItem, ApiError, { id: string; data: Partial<ServiceRateCardItem> }>({
        mutationFn: async ({ id, data }) => {
            const response = await apiClient.put(`/admin/service-ratecards/${id}`, data);
            return response.data.data || response.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.serviceRateCards.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.serviceRateCards.detail(variables.id) });
            showSuccessToast('Service rate card updated');
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
};

export const useImportServiceRateCard = (
    options?: UseMutationOptions<ServiceRateCardItem, ApiError, { id: string; zoneRules: ServiceRateCardItem['zoneRules']; metadata?: Record<string, unknown> }>
) => {
    const queryClient = useQueryClient();
    return useMutation<ServiceRateCardItem, ApiError, { id: string; zoneRules: ServiceRateCardItem['zoneRules']; metadata?: Record<string, unknown> }>({
        mutationFn: async ({ id, zoneRules, metadata }) => {
            const response = await apiClient.post(`/admin/service-ratecards/${id}/import`, { zoneRules, metadata });
            return response.data.data || response.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.serviceRateCards.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.serviceRateCards.detail(variables.id) });
            showSuccessToast('Service rate card imported');
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
};

export const useSimulateServiceRateCard = (
    options?: UseMutationOptions<
        { card: Record<string, unknown>; pricing: Record<string, unknown> },
        ApiError,
        {
            id: string;
            weight: number;
            dimensions?: { length: number; width: number; height: number };
            zone?: string;
            paymentMode?: 'cod' | 'prepaid';
            orderValue?: number;
            provider?: 'velocity' | 'delhivery' | 'ekart';
            flowType?: 'forward' | 'reverse';
            category?: 'default' | 'basic' | 'standard' | 'advanced' | 'custom';
            fromPincode?: string;
            toPincode?: string;
        }
    >
) => {
    return useMutation<
        { card: Record<string, unknown>; pricing: Record<string, unknown> },
        ApiError,
        {
            id: string;
            weight: number;
            dimensions?: { length: number; width: number; height: number };
            zone?: string;
            paymentMode?: 'cod' | 'prepaid';
            orderValue?: number;
            provider?: 'velocity' | 'delhivery' | 'ekart';
            flowType?: 'forward' | 'reverse';
            category?: 'default' | 'basic' | 'standard' | 'advanced' | 'custom';
            fromPincode?: string;
            toPincode?: string;
        }
    >({
        mutationFn: async ({ id, ...payload }) => {
            const response = await apiClient.post(`/admin/service-ratecards/${id}/simulate`, payload);
            return response.data.data || response.data;
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
};
