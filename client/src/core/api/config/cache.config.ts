/**
 * Cache Configuration & Invalidation Strategy
 *
 * Centralized cache management for React Query with intelligent
 * cache timing and retry strategies.
 */

/**
 * Cache timing configuration
 * Defines staleTime and gcTime for different data categories
 */
export const CACHE_TIMES = {
  SHORT: {
    staleTime: 5 * 60 * 1000,
    gcTime: 50 * 60 * 1000,
  },
  MEDIUM: {
    staleTime: 15 * 60 * 1000,
    gcTime: 150 * 60 * 1000,
  },
  LONG: {
    staleTime: 30 * 60 * 1000,
    gcTime: 300 * 60 * 1000,
  },
  REALTIME: {
    staleTime: 1000,
    gcTime: 10 * 60 * 1000,
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
