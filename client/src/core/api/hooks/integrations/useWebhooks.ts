import { useMutation, useQuery, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../client';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { showSuccessToast, handleApiError } from '@/src/lib/error';
import type { Webhook, CreateWebhookPayload, TestWebhookPayload } from '@/src/types/api/settings';

/**
 * Fetch all webhooks
 */
export const useWebhooks = (options?: UseQueryOptions<Webhook[], ApiError>) => {
    return useQuery<Webhook[], ApiError>({
        queryKey: queryKeys.settings.webhooks(),
        queryFn: async () => {
            const response = await apiClient.get<{ data: { webhooks: Webhook[] } }>('/webhooks');
            return response.data.data.webhooks;
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Create a new webhook
 */
export const useCreateWebhook = (options?: UseMutationOptions<any, ApiError, CreateWebhookPayload>) => {
    const queryClient = useQueryClient();

    return useMutation<any, ApiError, CreateWebhookPayload>({
        mutationFn: async (data: CreateWebhookPayload) => {
            const response = await apiClient.post('/webhooks', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.settings.webhooks() });
            showSuccessToast('Webhook created successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Test a webhook
 */
export const useTestWebhook = (options?: UseMutationOptions<any, ApiError, TestWebhookPayload>) => {
    return useMutation<any, ApiError, TestWebhookPayload>({
        mutationFn: async ({ webhookId, event }: TestWebhookPayload) => {
            const response = await apiClient.post(`/webhooks/${webhookId}/test`, { event });
            return response.data;
        },
        onSuccess: () => {
            showSuccessToast('Webhook test sent successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.NO_RETRY,
        ...options,
    });
};

/**
 * Delete webhook
 */
export const useDeleteWebhook = (options?: UseMutationOptions<any, ApiError, string>) => {
    const queryClient = useQueryClient();

    return useMutation<any, ApiError, string>({
        mutationFn: async (webhookId: string) => {
            const response = await apiClient.delete(`/webhooks/${webhookId}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.settings.webhooks() });
            showSuccessToast('Webhook deleted successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};
