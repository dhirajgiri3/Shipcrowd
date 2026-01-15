import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import { queryKeys } from '../queryKeys';
import { toast } from 'sonner';

// Types
interface Webhook {
    _id: string;
    url: string;
    events: string[];
    status: 'active' | 'inactive' | 'failed';
    secret: string;
    createdAt: string;
    lastTriggered?: string;
    failureCount?: number;
}

interface CreateWebhookRequest {
    url: string;
    events: string[];
    secret?: string;
}

interface TestWebhookRequest {
    webhookId: string;
    event?: string;
}

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
        mutationFn: async (data: CreateWebhookRequest) => {
            const response = await apiClient.post('/webhooks', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.settings.webhooks() });
            toast.success('Webhook created successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to create webhook');
        },
    });
};

/**
 * Test a webhook
 */
export const useTestWebhook = () => {
    return useMutation({
        mutationFn: async ({ webhookId, event }: TestWebhookRequest) => {
            const response = await apiClient.post(`/webhooks/${webhookId}/test`, { event });
            return response.data;
        },
        onSuccess: () => {
            toast.success('Webhook test sent successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to test webhook');
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
            toast.error(error.response?.data?.message || 'Failed to delete webhook');
        },
    });
};
