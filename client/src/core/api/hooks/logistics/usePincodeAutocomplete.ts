import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

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

            try {
                // TODO: Replace with actual API endpoint when backend is ready
                // const response = await fetch(`/api/v1/pincodes/${debouncedPincode}`);
                // if (!response.ok) throw new Error('Failed to fetch pincode data');
                // return await response.json();

                // Mock implementation for now
                await new Promise(resolve => setTimeout(resolve, 500));

                // Mock data based on common Indian pincodes
                const mockData: Record<string, Omit<PincodeData, 'pincode'>> = {
                    '400001': { city: 'Mumbai', state: 'Maharashtra', district: 'Mumbai City' },
                    '110001': { city: 'New Delhi', state: 'Delhi', district: 'Central Delhi' },
                    '560001': { city: 'Bangalore', state: 'Karnataka', district: 'Bangalore Urban' },
                    '700001': { city: 'Kolkata', state: 'West Bengal', district: 'Kolkata' },
                    '600001': { city: 'Chennai', state: 'Tamil Nadu', district: 'Chennai' },
                    '500001': { city: 'Hyderabad', state: 'Telangana', district: 'Hyderabad' },
                };

                const result = mockData[debouncedPincode];

                if (result) {
                    return {
                        success: true,
                        data: {
                            pincode: debouncedPincode,
                            ...result,
                        },
                    };
                }

                return {
                    success: false,
                    error: 'Pincode not found',
                };
            } catch (err) {
                return {
                    success: false,
                    error: err instanceof Error ? err.message : 'Failed to fetch pincode data',
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
