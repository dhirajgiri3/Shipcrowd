/**
 * Cache Configuration & Invalidation Strategy
 *
 * Centralized cache management for React Query with intelligent
 * cache timing and retry strategies.
 *
 * OPTIMIZED FOR REAL-TIME E-COMMERCE:
 * - Reduced staleTime across all tiers for faster order sync
 * - Orders from Shopify/WooCommerce/Amazon/Flipkart appear within 30-60 seconds
 */

/**
 * Cache timing configuration
 * Defines staleTime and gcTime for different data categories
 */
export const CACHE_TIMES = {
  SHORT: {
    staleTime: 30 * 1000, // 30 seconds - for frequently changing data (orders, shipments)
    gcTime: 5 * 60 * 1000, // 5 minutes
  },
  MEDIUM: {
    staleTime: 2 * 60 * 1000, // 2 minutes - for moderately changing data
    gcTime: 10 * 60 * 1000, // 10 minutes
  },
  LONG: {
    staleTime: 10 * 60 * 1000, // 10 minutes - for rarely changing data (settings, products)
    gcTime: 30 * 60 * 1000, // 30 minutes
  },
  REALTIME: {
    staleTime: 0, // Always fetch fresh - for real-time data
    gcTime: 1 * 60 * 1000, // 1 minute
  },
  NOCACHE: {
    staleTime: 0,
    gcTime: 0,
  },
};

/**
 * Retry configuration for different error types
 */
export const RETRY_CONFIG = {
  DEFAULT: 2,
  AGGRESSIVE: 3,
  NO_RETRY: 0,
};

/**
 * Background refetch configuration
 */
export const BACKGROUND_REFETCH = {
  ENABLED: {
    refetchInterval: 30 * 60 * 1000,
    refetchIntervalInBackground: true,
  },
  DISABLED: {
    refetchInterval: false,
  },
  AGGRESSIVE: {
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: true,
  },
};

export default {
  CACHE_TIMES,
  RETRY_CONFIG,
  BACKGROUND_REFETCH,
};
