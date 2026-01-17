/**
 * Centralized React Query Configuration
 * 
 * This file contains all timing and cache configuration for React Query.
 * Adjust these values based on data freshness requirements and UX needs.
 */

export const QUERY_CONFIG = {
    /**
     * Stale time: How long until data is considered "stale" and needs refetching
     */
    staleTime: {
        /** Default for most queries - 30 seconds */
        default: 30_000,

        /** Static data that rarely changes - 10 minutes */
        static: 600_000,

        /** Analytics dashboard data - 5 minutes */
        analytics: 300_000,

        /** Tracking data - 1 minute (more frequent updates) */
        tracking: 60_000,
    },

    /**
     * Garbage collection time: How long to keep unused data in cache
     * Default: 5 minutes after last usage
     */
    gcTime: 300_000,

    /**
     * Refetch intervals for auto-refreshing data
     */
    refetchInterval: {
        /** Seller dashboard - 30 seconds */
        dashboard: 30_000,

        /** Admin dashboard - 60 seconds */
        adminDashboard: 60_000,

        /** No auto-refresh */
        none: false,
    },

    /**
     * Retry configuration
     */
    retry: {
        /** Queries: retry twice on failure for better reliability */
        queries: 2,

        /** Mutations: don't retry (user-initiated actions) */
        mutations: 0,
    },

    /**
     * Window focus refetching
     * Disabled by default to reduce unnecessary API calls
     */
    refetchOnWindowFocus: false,

    /**
     * Network mode
     * - online: Only fetch when online
     * - always: Fetch even when offline (for offline-first apps)
     */
    networkMode: 'online' as const,
} as const;


