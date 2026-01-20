/**
 * Cache Configuration & Invalidation Strategy
 *
 * Centralized cache management for React Query with intelligent
 * invalidation patterns and cache update strategies.
 */

import { queryKeys } from './query-keys';

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
 * Cache invalidation strategy for different mutation types
 */
export const INVALIDATION_PATTERNS = {
  ORDER_MUTATIONS: {
    CREATE: () => [
      { queryKey: queryKeys.orders.list() },
      { queryKey: queryKeys.analytics.dashboard() },
    ],
    UPDATE: () => [
      { queryKey: queryKeys.orders.list() },
      { queryKey: queryKeys.shipments.list() },
    ],
    DELETE: () => [
      { queryKey: queryKeys.orders.list() },
      { queryKey: queryKeys.analytics.dashboard() },
    ],
  },
  SHIPMENT_MUTATIONS: {
    CREATE: () => [
      { queryKey: queryKeys.shipments.list() },
      { queryKey: queryKeys.orders.list() },
    ],
    UPDATE: () => [
      { queryKey: queryKeys.shipments.list() },
      { queryKey: queryKeys.shipments.all() },
    ],
    CANCEL: () => [
      { queryKey: queryKeys.shipments.list() },
      { queryKey: queryKeys.analytics.dashboard() },
    ],
  },
  WALLET_MUTATIONS: {
    ADD_MONEY: () => [
      { queryKey: queryKeys.wallet.balance() },
      { queryKey: queryKeys.wallet.transactions() },
      { queryKey: queryKeys.analytics.dashboard() },
    ],
    WITHDRAW: () => [
      { queryKey: queryKeys.wallet.balance() },
      { queryKey: queryKeys.wallet.transactions() },
    ],
    TRANSFER: () => [
      { queryKey: queryKeys.wallet.balance() },
      { queryKey: queryKeys.wallet.transactions() },
    ],
  },
  COD_MUTATIONS: {
    UPDATE_STATUS: () => [
      { queryKey: queryKeys.cod.remittances() },
      { queryKey: queryKeys.analytics.dashboard() },
    ],
  },
  NDR_MUTATIONS: {
    CREATE_ACTION: () => [
      { queryKey: queryKeys.ndr.list() },
      { queryKey: queryKeys.shipments.list() },
    ],
    UPDATE_STATUS: () => [
      { queryKey: queryKeys.ndr.list() },
      { queryKey: queryKeys.analytics.dashboard() },
    ],
  },
  RETURN_MUTATIONS: {
    INITIATE: () => [
      { queryKey: queryKeys.returns.list() },
      { queryKey: queryKeys.analytics.dashboard() },
    ],
    UPDATE_STATUS: () => [
      { queryKey: queryKeys.returns.list() },
    ],
  },
  DISPUTE_MUTATIONS: {
    CREATE: () => [
      { queryKey: queryKeys.disputes.list() },
      { queryKey: queryKeys.analytics.dashboard() },
    ],
    RESOLVE: () => [
      { queryKey: queryKeys.disputes.list() },
      { queryKey: queryKeys.wallet.balance() },
    ],
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
  INVALIDATION_PATTERNS,
  RETRY_CONFIG,
  BACKGROUND_REFETCH,
};
