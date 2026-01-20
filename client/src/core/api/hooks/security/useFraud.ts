/**
 * Fraud Detection API Hooks
 * 
 * React Query hooks for fraud alerts, rules, and blocked entities.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../client';
import { queryKeys } from '../../config/query-keys';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import type {
    FraudResponse,
    PaginatedFraudResponse,
    FraudAlert,
    FraudStats,
    FraudAlertFilters,
    FraudRule,
    CreateFraudRulePayload,
    BlockedEntity,
    BlockEntityPayload,
    InvestigationAction,
} from '@/src/types/api/security';

// ==================== Fraud Alerts ====================

export function useFraudAlerts(filters?: FraudAlertFilters) {
    return useQuery({
        queryKey: queryKeys.fraud.alerts(filters),
        queryFn: async () => {
            const { data } = await apiClient.get<PaginatedFraudResponse<FraudAlert[]>>(
                '/fraud/alerts',
                { params: filters }
            );
            return data;
        },
    });
}

export function useFraudAlert(alertId: string) {
    return useQuery({
        queryKey: queryKeys.fraud.alert(alertId),
        queryFn: async () => {
            const { data } = await apiClient.get<FraudResponse<FraudAlert>>(
                `/fraud/alerts/${alertId}`
            );
            return data.data;
        },
        enabled: !!alertId,
    });
}

export function useFraudStats() {
    return useQuery({
        queryKey: queryKeys.fraud.stats(),
        queryFn: async () => {
            const { data } = await apiClient.get<FraudResponse<FraudStats>>('/fraud/stats');
            return data.data;
        },
    });
}

export function useInvestigateAlert() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (action: InvestigationAction) => {
            const { data } = await apiClient.post(
                `/fraud/alerts/${action.alertId}/investigate`,
                action
            );
            return data;
        },
        onError: (error) => handleApiError(error, 'Failed to update investigation'),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.fraud.alert(variables.alertId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.fraud.alerts() });
            queryClient.invalidateQueries({ queryKey: queryKeys.fraud.stats() });
            showSuccessToast('Investigation updated');
        },
    });
}

// ==================== Fraud Rules ====================

export function useFraudRules() {
    return useQuery({
        queryKey: queryKeys.fraud.rules(),
        queryFn: async () => {
            const { data } = await apiClient.get<FraudResponse<FraudRule[]>>('/fraud/rules');
            return data.data;
        },
    });
}

export function useCreateFraudRule() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateFraudRulePayload) => {
            const { data } = await apiClient.post<FraudResponse<FraudRule>>(
                '/fraud/rules',
                payload
            );
            return data.data;
        },
        onError: (error) => handleApiError(error, 'Failed to create fraud rule'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.fraud.rules() });
            showSuccessToast('Fraud rule created');
        },
    });
}

export function useUpdateFraudRule() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ ruleId, payload }: { ruleId: string; payload: Partial<FraudRule> }) => {
            const { data } = await apiClient.put(`/fraud/rules/${ruleId}`, payload);
            return data;
        },
        onError: (error) => handleApiError(error, 'Failed to update fraud rule'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.fraud.rules() });
            showSuccessToast('Fraud rule updated');
        },
    });
}

export function useDeleteFraudRule() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (ruleId: string) => {
            await apiClient.delete(`/fraud/rules/${ruleId}`);
        },
        onError: (error) => handleApiError(error, 'Failed to delete fraud rule'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.fraud.rules() });
            showSuccessToast('Fraud rule deleted');
        },
    });
}

export function useToggleFraudRule() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ ruleId, enabled }: { ruleId: string; enabled: boolean }) => {
            const { data } = await apiClient.patch(`/fraud/rules/${ruleId}/toggle`, { enabled });
            return data;
        },
        onError: (error) => handleApiError(error, 'Failed to toggle fraud rule'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.fraud.rules() });
        },
    });
}

// ==================== Blocked Entities ====================

export function useBlockedEntities() {
    return useQuery({
        queryKey: queryKeys.fraud.blockedEntities(),
        queryFn: async () => {
            const { data } = await apiClient.get<FraudResponse<BlockedEntity[]>>(
                '/fraud/blocked-entities'
            );
            return data.data;
        },
    });
}

export function useBlockEntity() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: BlockEntityPayload) => {
            const { data } = await apiClient.post<FraudResponse<BlockedEntity>>(
                '/fraud/blocked-entities',
                payload
            );
            return data.data;
        },
        onError: (error) => handleApiError(error, 'Failed to block entity'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.fraud.blockedEntities() });
            showSuccessToast('Entity blocked successfully');
        },
    });
}

export function useUnblockEntity() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (entityId: string) => {
            await apiClient.delete(`/fraud/blocked-entities/${entityId}`);
        },
        onError: (error) => handleApiError(error, 'Failed to unblock entity'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.fraud.blockedEntities() });
            showSuccessToast('Entity unblocked');
        },
    });
}
