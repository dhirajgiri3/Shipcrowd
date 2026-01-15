/**
 * Settings API Hooks
 * 
 * React Query hooks for webhooks, team management, audit logs, and subscriptions.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import { queryKeys } from '../queryKeys';
import { handleApiError, showSuccessToast } from '@/src/lib/error-handler';
import type {
    SettingsResponse,
    PaginatedSettingsResponse,
    Webhook,
    CreateWebhookPayload,
    WebhookLog,
    TestWebhookPayload,
    TeamMember,
    InviteTeamMemberPayload,
    UpdateMemberRolePayload,
    TeamInvitation,
    AuditLog,
    AuditLogFilters,
    SubscriptionPlan,
    CurrentSubscription,
    BillingHistory,
    ChangePlanPayload,
} from '@/src/types/api/settings.types';

// ==================== Webhooks ====================

export function useWebhooks() {
    return useQuery({
        queryKey: queryKeys.settings.webhooks(),
        queryFn: async () => {
            const { data } = await apiClient.get<SettingsResponse<Webhook[]>>('/webhooks');
            return data.data;
        },
    });
}

export function useCreateWebhook() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateWebhookPayload) => {
            const { data } = await apiClient.post<SettingsResponse<Webhook>>('/webhooks', payload);
            return data.data;
        },
        onError: (error) => handleApiError(error, 'Failed to create webhook'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.settings.webhooks() });
            showSuccessToast('Webhook created successfully');
        },
    });
}

export function useTestWebhook() {
    return useMutation({
        mutationFn: async (payload: TestWebhookPayload) => {
            const { data } = await apiClient.post(`/webhooks/${payload.webhookId}/test`, {
                event: payload.event,
            });
            return data;
        },
        onError: (error) => handleApiError(error, 'Failed to test webhook'),
        onSuccess: () => showSuccessToast('Test webhook triggered successfully'),
    });
}

export function useWebhookLogs(webhookId: string) {
    return useQuery({
        queryKey: queryKeys.settings.webhookLogs(webhookId),
        queryFn: async () => {
            const { data } = await apiClient.get<SettingsResponse<WebhookLog[]>>(
                `/webhooks/${webhookId}/logs`
            );
            return data.data;
        },
        enabled: !!webhookId,
    });
}

export function useDeleteWebhook() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (webhookId: string) => {
            await apiClient.delete(`/webhooks/${webhookId}`);
        },
        onError: (error) => handleApiError(error, 'Failed to delete webhook'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.settings.webhooks() });
            showSuccessToast('Webhook deleted');
        },
    });
}

// ==================== Team Management ====================

export function useTeamMembers() {
    return useQuery({
        queryKey: queryKeys.settings.teamMembers(),
        queryFn: async () => {
            const { data } = await apiClient.get<SettingsResponse<TeamMember[]>>('/team/members');
            return data.data;
        },
    });
}

export function useInviteTeamMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: InviteTeamMemberPayload) => {
            const { data } = await apiClient.post<SettingsResponse<TeamInvitation>>('/team/invite', payload);
            return data.data;
        },
        onError: (error) => handleApiError(error, 'Failed to send invitation'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.settings.teamMembers() });
            showSuccessToast('Invitation sent successfully');
        },
    });
}

export function useUpdateMemberRole() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: UpdateMemberRolePayload) => {
            const { data } = await apiClient.put(`/team/members/${payload.userId}/role`, {
                role: payload.role,
            });
            return data;
        },
        onError: (error) => handleApiError(error, 'Failed to update role'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.settings.teamMembers() });
            showSuccessToast('Role updated successfully');
        },
    });
}

export function useRemoveTeamMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (userId: string) => {
            await apiClient.delete(`/team/members/${userId}`);
        },
        onError: (error) => handleApiError(error, 'Failed to remove team member'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.settings.teamMembers() });
            showSuccessToast('Team member removed');
        },
    });
}

// ==================== Audit Logs ====================

export function useAuditLogs(filters?: AuditLogFilters) {
    return useQuery({
        queryKey: queryKeys.settings.auditLogs(filters),
        queryFn: async () => {
            const { data } = await apiClient.get<PaginatedSettingsResponse<AuditLog[]>>(
                '/audit-logs',
                { params: filters }
            );
            return data;
        },
    });
}

export function useExportAuditLogs() {
    return useMutation({
        mutationFn: async (filters?: AuditLogFilters) => {
            const { data } = await apiClient.post<{ downloadUrl: string }>(
                '/audit-logs/export',
                filters
            );
            return data;
        },
        onError: (error) => handleApiError(error, 'Failed to export audit logs'),
        onSuccess: (data) => {
            showSuccessToast('Export ready');
            if (data.downloadUrl) {
                window.open(data.downloadUrl, '_blank');
            }
        },
    });
}

// ==================== Subscriptions ====================

export function useSubscriptionPlans() {
    return useQuery({
        queryKey: queryKeys.settings.plans(),
        queryFn: async () => {
            const { data } = await apiClient.get<SettingsResponse<SubscriptionPlan[]>>('/subscription/plans');
            return data.data;
        },
    });
}

export function useCurrentSubscription() {
    return useQuery({
        queryKey: queryKeys.settings.subscription(),
        queryFn: async () => {
            const { data } = await apiClient.get<SettingsResponse<CurrentSubscription>>('/subscription/current');
            return data.data;
        },
    });
}

export function useBillingHistory() {
    return useQuery({
        queryKey: queryKeys.settings.billing(),
        queryFn: async () => {
            const { data } = await apiClient.get<SettingsResponse<BillingHistory[]>>('/subscription/billing');
            return data.data;
        },
    });
}

export function useChangePlan() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: ChangePlanPayload) => {
            const { data } = await apiClient.post('/subscription/change', payload);
            return data;
        },
        onError: (error) => handleApiError(error, 'Failed to change plan'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.settings.subscription() });
      show SuccessToast('Plan updated successfully');
        },
    });
}

export function useCancelSubscription() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const { data } = await apiClient.post('/subscription/cancel');
            return data;
        },
        onError: (error) => handleApiError(error, 'Failed to cancel subscription'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.settings.subscription() });
            showSuccessToast('Subscription cancelled');
        },
    });
}
