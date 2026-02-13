import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/src/core/api/http';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError } from '@/src/lib/error';

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

type ServiceabilityMap = Record<string, boolean>;

const normalizeData = <T>(payload: any): T => {
    const level1 = payload?.data ?? payload;
    const level2 = level1?.data ?? level1;
    return level2 as T;
};

const toCourierCoverage = (serviceability: ServiceabilityMap): CourierCoverage[] => {
    const labelMap: Record<string, string> = {
        delhivery: 'Delhivery',
        bluedart: 'Blue Dart',
        ecom: 'Ecom Express',
        dtdc: 'DTDC',
        xpressbees: 'XpressBees',
        shadowfax: 'Shadowfax',
    };

    return Object.entries(serviceability)
        .filter(([, available]) => available)
        .map(([courier]) => {
            const mappedCourier = courier === 'ecom' ? 'ecom_express' : courier;
            return {
                courier: mappedCourier as CourierCoverage['courier'],
                courierDisplayName: labelMap[courier] || courier,
                serviceable: true,
                codAvailable: true,
                prepaidAvailable: true,
                estimatedDays: 3,
                zone: 'REST_OF_INDIA',
                surfaceAvailable: true,
                expressAvailable: true,
                pickupAvailable: true,
                reversePickupAvailable: false,
                sundayDelivery: false,
            };
        });
};

export const usePincodeServiceability = (
    pincode: string,
    options?: Omit<UseQueryOptions<PincodeServiceability>, 'queryKey' | 'queryFn'>
) => {
    return useQuery<PincodeServiceability>({
        queryKey: queryKeys.address.serviceability(pincode),
        queryFn: async () => {
            const response = await apiClient.get(`/serviceability/validate-pincode/${pincode}`);
            const data = normalizeData<{
                valid: boolean;
                city?: string;
                state?: string;
                district?: string;
                serviceability: ServiceabilityMap;
            }>(response.data);

            const serviceability = data?.serviceability || {};
            const serviceableCouriers = toCourierCoverage(serviceability);

            const pincodeInfo: PincodeInfo = {
                pincode,
                city: data?.city || '',
                state: data?.state || '',
                district: data?.district || data?.city || '',
                region: '',
                country: 'India',
                isMetro: false,
            };

            return {
                pincode,
                pincodeInfo,
                isServiceable: Boolean(data?.valid) && serviceableCouriers.length > 0,
                serviceableCouriers,
                nonServiceableCouriers: Object.entries(serviceability)
                    .filter(([, available]) => !available)
                    .map(([courier]) => courier),
                lastUpdated: new Date().toISOString(),
            };
        },
        enabled: pincode.length === 6 && /^\d{6}$/.test(pincode),
        ...CACHE_TIMES.LONG,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

export const useRouteServiceability = (
    request: ServiceabilityCheckRequest,
    options?: Omit<UseQueryOptions<ServiceabilityCheckResponse>, 'queryKey' | 'queryFn'>
) => {
    const { originPincode, destinationPincode } = request;

    return useQuery<ServiceabilityCheckResponse>({
        queryKey: queryKeys.address.routeServiceability(originPincode, destinationPincode),
        queryFn: async () => {
            const response = await apiClient.post('/serviceability/check-serviceability', {
                fromPincode: originPincode,
                toPincode: destinationPincode,
                courierId: request.courierPreference?.[0] || 'delhivery',
            });

            const data = normalizeData<{
                serviceable: boolean;
                estimatedDays?: number;
            }>(response.data);

            const estimatedDays = Number(data?.estimatedDays || 0);

            return {
                origin: {
                    pincode: originPincode,
                    city: '',
                    state: '',
                    district: '',
                    region: '',
                    country: 'India',
                    isMetro: false,
                },
                destination: {
                    pincode: destinationPincode,
                    city: '',
                    state: '',
                    district: '',
                    region: '',
                    country: 'India',
                    isMetro: false,
                },
                availableCouriers: data?.serviceable
                    ? [{
                        courier: (request.courierPreference?.[0] || 'delhivery') as CourierCoverage['courier'],
                        courierDisplayName: request.courierPreference?.[0] || 'Delhivery',
                        serviceable: true,
                        codAvailable: true,
                        prepaidAvailable: true,
                        estimatedDays: estimatedDays || 3,
                        zone: 'REST_OF_INDIA',
                        surfaceAvailable: true,
                        expressAvailable: true,
                        pickupAvailable: true,
                        reversePickupAvailable: false,
                        sundayDelivery: false,
                    }]
                    : [],
            };
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

export const useCityStateFromPincode = (
    pincode: string,
    options?: Omit<UseQueryOptions<PincodeInfo>, 'queryKey' | 'queryFn'>
) => {
    return useQuery<PincodeInfo>({
        queryKey: queryKeys.address.cityState(pincode),
        queryFn: async () => {
            const response = await apiClient.get(`/serviceability/pincode/${pincode}/info`);
            const info = normalizeData<any>(response.data);

            return {
                pincode: info?.pincode || pincode,
                city: info?.city || '',
                state: info?.state || '',
                district: info?.district || info?.city || '',
                region: info?.region || '',
                country: info?.country || 'India',
                isMetro: Boolean(info?.isMetro),
                latitude: info?.latitude,
                longitude: info?.longitude,
            };
        },
        enabled: pincode.length === 6 && /^\d{6}$/.test(pincode),
        ...CACHE_TIMES.LONG,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

export const useAddressSuggestions = (
    query: string,
    options?: Omit<UseQueryOptions<Address[]>, 'queryKey' | 'queryFn'>
) => {
    return useQuery<Address[]>({
        queryKey: queryKeys.address.suggestions(query),
        queryFn: async () => {
            const response = await apiClient.get('/serviceability/suggestions', {
                params: { q: query },
            });
            return normalizeData<Address[]>(response.data) || [];
        },
        enabled: query.length >= 2,
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.NO_RETRY,
        ...options,
    });
};

export const useValidateAddress = (
    options?: UseMutationOptions<AddressValidationResult, ApiError, Address>
) => {
    return useMutation<AddressValidationResult, ApiError, Address>({
        mutationFn: async (address) => {
            const response = await apiClient.get(`/serviceability/validate-pincode/${address.pincode}`);
            const data = normalizeData<any>(response.data);
            const valid = Boolean(data?.valid);

            return {
                isValid: valid,
                originalAddress: address,
                suggestedAddress: valid
                    ? {
                        ...address,
                        city: data?.city || address.city,
                        state: data?.state || address.state,
                    }
                    : undefined,
                errors: valid
                    ? []
                    : [{
                        field: 'pincode',
                        message: 'Invalid or non-serviceable pincode',
                        code: 'VAL_PINCODE_NOT_SERVICEABLE',
                    }],
                warnings: [],
            };
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

export const useBulkValidateAddresses = (
    options?: UseMutationOptions<BulkAddressValidationResult, ApiError, BulkAddressValidationRequest>
) => {
    return useMutation<BulkAddressValidationResult, ApiError, BulkAddressValidationRequest>({
        mutationFn: async (request) => {
            const results = await Promise.all(
                request.addresses.map(async (address) => {
                    const response = await apiClient.get(`/serviceability/validate-pincode/${address.pincode}`);
                    const data = normalizeData<any>(response.data);
                    const valid = Boolean(data?.valid);

                    return {
                        isValid: valid,
                        originalAddress: address,
                        suggestedAddress: valid
                            ? {
                                ...address,
                                city: data?.city || address.city,
                                state: data?.state || address.state,
                            }
                            : undefined,
                        errors: valid
                            ? []
                            : [{
                                field: 'pincode' as const,
                                message: 'Invalid or non-serviceable pincode',
                                code: 'VAL_PINCODE_NOT_SERVICEABLE',
                            }],
                        warnings: [],
                    };
                })
            );

            const validAddresses = results.filter((result) => result.isValid).length;
            return {
                totalAddresses: results.length,
                validAddresses,
                invalidAddresses: results.length - validAddresses,
                results,
                processedAt: new Date().toISOString(),
            };
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

export const useCheckMultipleCouriers = (
    options?: UseMutationOptions<CourierCoverage[], ApiError, { pincode: string; filters?: ServiceabilityFilters }>
) => {
    return useMutation<CourierCoverage[], ApiError, { pincode: string; filters?: ServiceabilityFilters }>({
        mutationFn: async ({ pincode }) => {
            const response = await apiClient.get(`/serviceability/validate-pincode/${pincode}`);
            const data = normalizeData<any>(response.data);
            return toCourierCoverage(data?.serviceability || {});
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

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
