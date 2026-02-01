/**
 * useSecurity Hooks
 * 
 * Data fetching and mutation hooks for Security & Fraud modules.
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import type { SecurityFraudAlert as FraudAlert, SecurityFraudRule as FraudRule, UpdateFraudRulePayload, ResolveAlertPayload } from '@/src/types/security';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

// Feature Archived: Fraud detection is currently disabled/archived.
// Returning empty data to prevent UI errors in existing components.

export function useFraudAlerts(status?: string, options?: UseQueryOptions<FraudAlert[], ApiError>) {
    return useQuery<FraudAlert[], ApiError>({
        queryKey: queryKeys.fraud.alerts(status as any),
        queryFn: async () => {
            return []; // Feature archived
        },
        ...CACHE_TIMES.LONG,
        enabled: false, // Disable automatic fetching
        ...options,
        initialData: []
    });
}

export function useFraudRules(options?: UseQueryOptions<FraudRule[], ApiError>) {
    return useQuery<FraudRule[], ApiError>({
        queryKey: queryKeys.fraud.rules(),
        queryFn: async () => {
            return []; // Feature archived
        },
        ...CACHE_TIMES.LONG,
        enabled: false, // Disable automatic fetching
        ...options,
        initialData: []
    });
}

export function useUpdateFraudRule(options?: UseMutationOptions<{ success: boolean } & UpdateFraudRulePayload, ApiError, UpdateFraudRulePayload>) {
    return useMutation<{ success: boolean } & UpdateFraudRulePayload, ApiError, UpdateFraudRulePayload>({
        mutationFn: async (payload: UpdateFraudRulePayload) => {
            return { success: true, ...payload }; // No-op
        },
        onSuccess: () => {
            showSuccessToast('Fraud detection is currently disabled');
        },
        ...options,
    });
}

export function useResolveAlert(options?: UseMutationOptions<{ success: boolean; id: string }, ApiError, ResolveAlertPayload>) {
    return useMutation<{ success: boolean; id: string }, ApiError, ResolveAlertPayload>({
        mutationFn: async (payload: ResolveAlertPayload) => {
            return { success: true, id: payload.alertId }; // No-op
        },
        onSuccess: () => {
            showSuccessToast('Fraud detection is currently disabled');
        },
        ...options,
    });
}
