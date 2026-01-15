/**
 * Performance Optimization Configuration
 * 
 * Centralized React Query configuration for optimal performance
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Optimized React Query defaults
 * - Prevents excessive refetching
 * - Implements smart caching strategy
 * - Adds retry logic with exponential backoff
 */
export const queryClientConfig = {
    defaultOptions: {
        queries: {
            // Stale time: How long data is considered fresh (5 minutes default)
            staleTime: 5 * 60 * 1000, // 5 minutes

            // Cache time: How long inactive queries stay in cache (10 minutes)
            gcTime: 10 * 60 * 1000, // Previously cacheTime in v4

            // Retry failed requests with exponential backoff
            retry: (failureCount: number, error: any) => {
                // Don't retry on 4xx errors (client errors)
                if (error?.response?.status >= 400 && error?.response?.status < 500) {
                    return false;
                }
                // Max 3 retries for server errors
                return failureCount < 3;
            },

            // Exponential backoff delay
            retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),

            // Refetch on window focus only if data is stale
            refetchOnWindowFocus: false,

            // Don't refetch on mount if data is fresh
            refetchOnMount: false,

            // Enable refetch on network reconnection
            refetchOnReconnect: true,
        },
        mutations: {
            // Retry mutations once
            retry: 1,

            // Retry delay for mutations
            retryDelay: 1000,
        },
    },
};

/**
 * Create an optimized Query Client instance
 */
export function createOptimizedQueryClient() {
    return new QueryClient(queryClientConfig);
}

/**
 * Hook to prevent duplicate requests
 * Useful for expensive operations or mutations
 */
export function useDedupedRequest() {
    const pendingRequests = new Map<string, Promise<any>>();

    return async <T>(key: string, requestFn: () => Promise<T>): Promise<T> => {
        // Check if request is already pending
        if (pendingRequests.has(key)) {
            return pendingRequests.get(key) as Promise<T>;
        }

        // Start new request
        const promise = requestFn().finally(() => {
            pendingRequests.delete(key);
        });

        pendingRequests.set(key, promise);
        return promise;
    };
}
