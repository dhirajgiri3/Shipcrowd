import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../config/client';
import { queryKeys } from '../config/queryKeys';
import { toast } from 'sonner';
import { handleApiError } from '@/src/lib/error-handler';
import type { Webhook, CreateWebhookPayload, TestWebhookPayload } from '@/src/types/api/settings.types';

/**
 * Fetch all webhooks
 */
export const useWebhooks = () => {
    return useQuery({
        queryKey: queryKeys.settings.webhooks(),
        queryFn: async () => {
            const response = await apiClient.get<{ data: { webhooks: Webhook[] } }>('/webhooks');
            return response.data.data.webhooks;
        },
    });
};

/**
 * Create a new webhook
 */
export const useCreateWebhook = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateWebhookPayload) => {
            const response = await apiClient.post('/webhooks', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.settings.webhooks() });
            toast.success('Webhook created successfully');
        },
        onError: (error: any) => {
            handleApiError(error, 'Failed to create webhook');
        },
    });
};

/**
 * Test a webhook
 */
export const useTestWebhook = () => {
    return useMutation({
        mutationFn: async ({ webhookId, event }: TestWebhookPayload) => {
            const response = await apiClient.post(`/webhooks/${webhookId}/test`, { event });
            return response.data;
        },
        onSuccess: () => {
            toast.success('Webhook test sent successfully');
        },
        onError: (error: any) => {
            handleApiError(error, 'Failed to test webhook');
        },
    });
};

/**
 * Delete webhook
 */
export const useDeleteWebhook = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (webhookId: string) => {
            const response = await apiClient.delete(`/webhooks/${webhookId}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.settings.webhooks() });
            toast.success('Webhook deleted successfully');
        },
        onError: (error: any) => {
            handleApiError(error, 'Failed to delete webhook');
        },
    });
};
