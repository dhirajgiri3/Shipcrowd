/**
 * Fraud Detection API Hooks (ARCHIVED)
 * 
 * Feature currently disabled. Hooks return empty data.
 */

import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { ApiError } from '../../client';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { showSuccessToast } from '@/src/lib/error';
import type {
    PaginatedFraudResponse,
    FraudAlert,
    FraudStats,
    FraudAlertFilters,
    FraudRule,
    FraudResponse,
    BlockedEntity,
    InvestigationAction,
} from '@/src/types/api/security';

// ==================== Fraud Alerts ====================

export function useFraudAlerts(filters?: FraudAlertFilters, options?: UseQueryOptions<PaginatedFraudResponse<FraudAlert[]>, ApiError>) {
    return useQuery<PaginatedFraudResponse<FraudAlert[]>, ApiError>({
        queryKey: queryKeys.fraud.alerts(filters),
        queryFn: async () => {
            return {
                success: true,
                data: [],
                pagination: {
                    page: 1,
                    limit: 10,
                    total: 0
                }
            };
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        enabled: false, // Feature Archived
        ...options,
        initialData: {
            success: true,
            data: [],
            pagination: {
                page: 1,
                limit: 10,
                total: 0
            }
        }
    });
}

export function useFraudAlert(alertId: string, options?: UseQueryOptions<FraudAlert, ApiError>) {
    return useQuery<FraudAlert, ApiError>({
        queryKey: queryKeys.fraud.alert(alertId),
        queryFn: async () => {
            throw new Error('Fraud detection is archived/disabled');
        },
        enabled: false, // Feature Archived
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useFraudStats(options?: UseQueryOptions<FraudStats, ApiError>) {
    return useQuery<FraudStats, ApiError>({
        queryKey: queryKeys.fraud.stats(),
        queryFn: async () => {
            return {
                total: 0,
                byStatus: { new: 0, investigating: 0, resolved: 0, false_positive: 0, confirmed_fraud: 0 },
                byRiskLevel: { critical: 0, high: 0, medium: 0, low: 0 },
                recentTrend: { period: '30d', count: 0, change: 0 },
                topTypes: []
            };
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        enabled: false, // Feature Archived
        ...options,
        initialData: {
            total: 0,
            byStatus: { new: 0, investigating: 0, resolved: 0, false_positive: 0, confirmed_fraud: 0 },
            byRiskLevel: { critical: 0, high: 0, medium: 0, low: 0 },
            recentTrend: { period: '30d', count: 0, change: 0 },
            topTypes: []
        }
    });
}

export function useInvestigateAlert(options?: UseMutationOptions<any, ApiError, InvestigationAction>) {
    return useMutation<any, ApiError, InvestigationAction>({
        mutationFn: async () => {
            return { success: true, data: {} };
        },
        onSuccess: () => {
            showSuccessToast('Fraud detection is disabled');
        },
        ...options,
    });
}

// ==================== Fraud Rules ====================

export function useFraudRules() {
    return useQuery({
        queryKey: queryKeys.fraud.rules(),
        queryFn: async () => {
            return [];
        },
        enabled: false,
        initialData: []
    });
}

export function useCreateFraudRule() {
    return useMutation({
        mutationFn: async () => {
            return {} as FraudRule;
        },
        onSuccess: () => {
            showSuccessToast('Fraud detection is disabled');
        },
    });
}

export function useUpdateFraudRule() {
    return useMutation({
        mutationFn: async () => {
            return {};
        },
        onSuccess: () => {
            showSuccessToast('Fraud detection is disabled');
        },
    });
}

export function useDeleteFraudRule() {
    return useMutation({
        mutationFn: async () => {
            // no-op
        },
        onSuccess: () => {
            showSuccessToast('Fraud detection is disabled');
        },
    });
}

export function useToggleFraudRule() {
    return useMutation({
        mutationFn: async () => {
            return {};
        },
    });
}

// ==================== Blocked Entities ====================

export function useBlockedEntities() {
    return useQuery({
        queryKey: queryKeys.fraud.blockedEntities(),
        queryFn: async () => {
            return [];
        },
        enabled: false,
        initialData: []
    });
}

export function useBlockEntity() {
    return useMutation({
        mutationFn: async () => {
            return {} as BlockedEntity;
        },
        onSuccess: () => {
            showSuccessToast('Fraud detection is disabled');
        },
    });
}

export function useUnblockEntity() {
    return useMutation({
        mutationFn: async () => {
            // no-op
        },
        onSuccess: () => {
            showSuccessToast('Fraud detection is disabled');
        },
    });
}
