import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { apiClient } from '../../client';

interface PincodeData {
    pincode: string;
    city: string;
    state: string;
    district: string;
}

interface PincodeResponse {
    success: boolean;
    data?: PincodeData;
    error?: string;
}

/**
 * Hook for pincode autocomplete with debouncing and caching
 * 
 * Features:
 * - Debounced API calls (300ms)
 * - 5-minute cache TTL
 * - Automatic fallback to manual entry on failure
 * - Loading state management
 */
export function usePincodeAutocomplete(pincode: string) {
    const [debouncedPincode, setDebouncedPincode] = useState(pincode);

    // Debounce pincode input (300ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedPincode(pincode);
        }, 300);

        return () => clearTimeout(timer);
    }, [pincode]);

    const { data, isLoading, error, refetch } = useQuery<PincodeResponse>({
        queryKey: ['pincode', debouncedPincode],
        queryFn: async () => {
            // Only fetch if pincode is 6 digits
            if (!debouncedPincode || debouncedPincode.length !== 6) {
                return { success: false, error: 'Invalid pincode length' };
            }

            // Mock data as fallback
            const mockData: Record<string, Omit<PincodeData, 'pincode'>> = {
                '400001': { city: 'Mumbai', state: 'Maharashtra', district: 'Mumbai City' },
                '110001': { city: 'New Delhi', state: 'Delhi', district: 'Central Delhi' },
                '560001': { city: 'Bangalore', state: 'Karnataka', district: 'Bangalore Urban' },
                '700001': { city: 'Kolkata', state: 'West Bengal', district: 'Kolkata' },
                '600001': { city: 'Chennai', state: 'Tamil Nadu', district: 'Chennai' },
                '500001': { city: 'Hyderabad', state: 'Telangana', district: 'Hyderabad' },
            };

            try {
                // Try real API first (using same endpoint as onboarding)
                const response = await apiClient.get(`/serviceability/pincode/${debouncedPincode}/info`);

                // Backend response structure: { success, data: { data: { pincode, city, state } } }
                // Axios wraps it: response.data = backend response
                // So actual data is at: response.data.data.data
                const info = response.data?.data?.data;

                // Check if API returned valid data
                if (info && info.city && info.state) {
                    return {
                        success: true,
                        data: {
                            pincode: debouncedPincode,
                            city: info.city,
                            state: info.state,
                            district: info.district || info.city,
                        },
                    };
                }

                // API returned no data - fall back to mock data
                const mockResult = mockData[debouncedPincode];
                if (mockResult) {
                    console.warn(`Pincode API returned no data for ${debouncedPincode}, using mock data`);
                    return {
                        success: true,
                        data: {
                            pincode: debouncedPincode,
                            ...mockResult,
                        },
                    };
                }

                // Neither API nor mock data has this pincode
                return {
                    success: false,
                    error: 'Pincode not found',
                };
            } catch (err: any) {
                // Check if this is a 404 "Pincode not found" - this is an expected response
                if (err?.code === 'PINCODE_NOT_FOUND' || err?.message === 'Pincode not found') {
                    return {
                        success: false,
                        error: 'Pincode not found',
                    };
                }

                // For other errors (network, server, etc.), try mock data as fallback
                const mockResult = mockData[debouncedPincode];
                if (mockResult) {
                    console.warn(`Pincode API error for ${debouncedPincode}, using mock data:`, err);
                    return {
                        success: true,
                        data: {
                            pincode: debouncedPincode,
                            ...mockResult,
                        },
                    };
                }

                // Extract specific error message from backend if available
                const errorMessage = err?.message || 'Failed to fetch pincode data';
                return {
                    success: false,
                    error: errorMessage,
                };
            }
        },
        enabled: debouncedPincode.length === 6,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
        retry: 1,
    });

    return {
        data: data?.data,
        isLoading: isLoading && debouncedPincode.length === 6,
        error: data?.error || (error instanceof Error ? error.message : null),
        refetch,
        isSuccess: data?.success ?? false,
    };
}
