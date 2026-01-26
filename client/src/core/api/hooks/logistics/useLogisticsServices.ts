/**
 * Logistics Services API Hooks
 *
 * React Query hooks for pincode validation, serviceability checks, and address services
 * Backend: POST/GET /api/v1/logistics/*
 */

import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../client';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError } from '@/src/lib/error';

export interface PincodeInfo {
    pincode: string;
    city: string;
    state: string;
    country: string;
    region: string;
    zone: string;
    isServiceable: boolean;
    servicingCouriers: string[];
}

export interface ServiceabilityCheck {
    serviceable: boolean;
    pickupAvailable: boolean;
    deliveryAvailable: boolean;
    estimatedDays: number;
    zones: Array<{
        courier: string;
        available: boolean;
        estimatedDays: number;
        charges: number;
    }>;
}

export interface AddressSuggestion {
    address: string;
    city: string;
    state: string;
    pincode: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
}

export interface PincodeValidationResponse {
    valid: boolean;
    pincode: string;
    info?: PincodeInfo;
    error?: string;
}

/**
 * Get pincode information
 * GET /logistics/address/pincode/:pincode/info
 */
export const usePincodeInfo = (pincode: string, options?: UseQueryOptions<PincodeInfo, ApiError>) => {
    return useQuery<PincodeInfo, ApiError>({
        queryKey: queryKeys.address.cityState(pincode),
        queryFn: async () => {
            const response = await apiClient.get<{ data: PincodeInfo }>(
                `/logistics/address/pincode/${pincode}/info`
            );
            return response.data.data;
        },
        enabled: !!pincode && pincode.length >= 4,
        ...CACHE_TIMES.LONG,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Check serviceability for origin-destination
 * POST /logistics/address/check-serviceability
 */
export const useCheckServiceability = (options?: UseMutationOptions<ServiceabilityCheck, ApiError, {
    originPincode: string;
    destinationPincode: string;
    weight?: number;
    productType?: string;
}>) => {
    return useMutation<ServiceabilityCheck, ApiError, {
        originPincode: string;
        destinationPincode: string;
        weight?: number;
        productType?: string;
    }>({
        mutationFn: async (payload) => {
            const response = await apiClient.post<{ data: ServiceabilityCheck }>(
                '/logistics/address/check-serviceability',
                payload
            );
            return response.data.data;
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
};

/**
 * Validate pincode
 * POST /logistics/pincode/validate
 */
export const useValidatePincode = (options?: UseMutationOptions<PincodeValidationResponse, ApiError, string>) => {
    return useMutation<PincodeValidationResponse, ApiError, string>({
        mutationFn: async (pincode: string) => {
            const response = await apiClient.post<{ data: PincodeValidationResponse }>(
                '/logistics/pincode/validate',
                { pincode }
            );
            return response.data.data;
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
};

/**
 * Get address suggestions/autocomplete
 * GET /logistics/address/suggestions
 */
export const useAddressSuggestions = (query: string, options?: UseQueryOptions<AddressSuggestion[], ApiError>) => {
    return useQuery<AddressSuggestion[], ApiError>({
        queryKey: queryKeys.address.suggestions(query),
        queryFn: async () => {
            const response = await apiClient.get<{
                data: { suggestions: AddressSuggestion[] };
            }>('/logistics/address/suggestions', {
                params: { query },
            });
            return response.data.data.suggestions;
        },
        enabled: !!query && query.length >= 3,
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};
