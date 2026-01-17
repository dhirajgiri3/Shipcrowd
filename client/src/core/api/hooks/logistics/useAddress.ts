/**
 * Address & Serviceability API Hooks
 * 
 * React Query hooks for pincode serviceability, address validation,
 * and courier coverage operations.
 * Backend: GET/POST /api/v1/serviceability/*
 */

import { useQuery, useMutation, UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '@/src/core/api/config/client';
import { queryKeys } from '../../config/queryKeys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cacheConfig';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

// ==================== Import Types ====================
import type {
    PincodeServiceability,
    PincodeInfo,
    ServiceabilityCheckRequest,
    ServiceabilityCheckResponse,
    BulkAddressValidationRequest,
    BulkAddressValidationResult,
    Address,
    AddressValidationResult,
    ServiceabilityFilters,
    CourierCoverage,
} from '@/src/types/api/logistics';

// ==================== Query Hooks ====================

/**
 * Check serviceability for a single pincode
 * Gets all courier coverage information for the destination
 */
export const usePincodeServiceability = (
    pincode: string,
    options?: Omit<UseQueryOptions<PincodeServiceability>, 'queryKey' | 'queryFn'>
) => {
    return useQuery<PincodeServiceability>({
        queryKey: queryKeys.address.serviceability(pincode),
        queryFn: async () => {
            const response = await apiClient.get(`/serviceability/pincode/${pincode}`);
            return response.data.data;
        },
        enabled: pincode.length === 6 && /^\d{6}$/.test(pincode),
        ...CACHE_TIMES.LONG, // Pincode data doesn't change often
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Check route serviceability (origin -> destination)
 * Gets available couriers for a specific route
 */
export const useRouteServiceability = (
    request: ServiceabilityCheckRequest,
    options?: Omit<UseQueryOptions<ServiceabilityCheckResponse>, 'queryKey' | 'queryFn'>
) => {
    const { originPincode, destinationPincode } = request;

    return useQuery<ServiceabilityCheckResponse>({
        queryKey: queryKeys.address.routeServiceability(originPincode, destinationPincode),
        queryFn: async () => {
            const response = await apiClient.post('/serviceability/check', request);
            return response.data.data;
        },
        enabled:
            originPincode.length === 6 &&
            destinationPincode.length === 6 &&
            /^\d{6}$/.test(originPincode) &&
            /^\d{6}$/.test(destinationPincode),
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Get city and state from pincode (lightweight lookup)
 */
export const useCityStateFromPincode = (
    pincode: string,
    options?: Omit<UseQueryOptions<PincodeInfo>, 'queryKey' | 'queryFn'>
) => {
    return useQuery<PincodeInfo>({
        queryKey: queryKeys.address.cityState(pincode),
        queryFn: async () => {
            const response = await apiClient.get(`/serviceability/pincode/${pincode}/info`);
            return response.data.data;
        },
        enabled: pincode.length === 6 && /^\d{6}$/.test(pincode),
        ...CACHE_TIMES.LONG,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Get address suggestions for autocomplete
 */
export const useAddressSuggestions = (
    query: string,
    options?: Omit<UseQueryOptions<Address[]>, 'queryKey' | 'queryFn'>
) => {
    return useQuery<Address[]>({
        queryKey: queryKeys.address.suggestions(query),
        queryFn: async () => {
            const response = await apiClient.get('/serviceability/address/suggestions', {
                params: { q: query },
            });
            return response.data.data;
        },
        enabled: query.length >= 3,
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.NO_RETRY, // Don't retry autocomplete
        ...options,
    });
};

// ==================== Mutation Hooks ====================

/**
 * Validate a single address
 */
export const useValidateAddress = () => {
    return useMutation<AddressValidationResult, Error, Address>({
        mutationFn: async (address) => {
            const response = await apiClient.post('/serviceability/address/validate', address);
            return response.data.data;
        },
        onError: (error) => {
            handleApiError(error, 'Address Validation Failed');
        },
    });
};

/**
 * Bulk validate addresses from CSV
 */
export const useBulkValidateAddresses = () => {
    return useMutation<BulkAddressValidationResult, Error, BulkAddressValidationRequest>({
        mutationFn: async (request) => {
            const response = await apiClient.post('/serviceability/address/bulk-validate', request);
            return response.data.data;
        },
        onSuccess: (data) => {
            const { totalAddresses, validAddresses, invalidAddresses } = data;
            showSuccessToast(
                `Validated ${totalAddresses} addresses: ${validAddresses} valid, ${invalidAddresses} invalid`
            );
        },
        onError: (error) => {
            handleApiError(error, 'Bulk Validation Failed');
        },
    });
};

/**
 * Check serviceability for multiple couriers at once
 */
export const useCheckMultipleCouriers = () => {
    return useMutation<CourierCoverage[], Error, { pincode: string; filters?: ServiceabilityFilters }>({
        mutationFn: async ({ pincode, filters }) => {
            const response = await apiClient.post('/serviceability/couriers/check', {
                pincode,
                ...filters,
            });
            return response.data.data;
        },
        onError: (error) => {
            handleApiError(error, 'Courier Check Failed');
        },
    });
};

// ==================== Utility Hooks ====================

/**
 * Combined hook for pincode lookup with auto-fill
 * Handles pincode input, validation, and serviceability check
 */
export const usePincodeLookup = (pincode: string) => {
    const cityStateQuery = useCityStateFromPincode(pincode);
    const serviceabilityQuery = usePincodeServiceability(pincode, {
        enabled: cityStateQuery.isSuccess,
    });

    return {
        isLoading: cityStateQuery.isLoading || serviceabilityQuery.isLoading,
        isError: cityStateQuery.isError || serviceabilityQuery.isError,
        error: cityStateQuery.error || serviceabilityQuery.error,
        pincodeInfo: cityStateQuery.data,
        serviceability: serviceabilityQuery.data,
        isServiceable: serviceabilityQuery.data?.isServiceable ?? false,
        availableCouriers: serviceabilityQuery.data?.serviceableCouriers ?? [],
        refetch: () => {
            cityStateQuery.refetch();
            serviceabilityQuery.refetch();
        },
    };
};
