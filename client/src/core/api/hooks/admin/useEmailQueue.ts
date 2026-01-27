import { useMutation, useQuery, useQueryClient, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

export interface EmailQueueStats {
    total?: number;
    waiting?: number;
    active?: number;
    completed?: number;
    failed?: number;
}

export interface EmailQueueJob {
    id: string;
    name?: string;
    failedReason?: string;
    timestamp?: number;
    processedOn?: number;
    finishedOn?: number;
    data?: any;
}

export function useEmailQueueStats(options?: UseQueryOptions<EmailQueueStats, ApiError>) {
    return useQuery<EmailQueueStats, ApiError>({
        queryKey: queryKeys.adminOps.emailQueueStats(),
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: EmailQueueStats }>(
                '/admin/email-queue/stats'
            );
            return data.data;
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useFailedEmailJobs(options?: UseQueryOptions<EmailQueueJob[], ApiError>) {
    return useQuery<EmailQueueJob[], ApiError>({
        queryKey: queryKeys.adminOps.emailQueueFailed(),
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: EmailQueueJob[] }>(
                '/admin/email-queue/failed'
            );
            return data.data;
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useRecentEmailJobs(options?: UseQueryOptions<EmailQueueJob[], ApiError>) {
    return useQuery<EmailQueueJob[], ApiError>({
        queryKey: queryKeys.adminOps.emailQueueRecent(),
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: EmailQueueJob[] }>(
                '/admin/email-queue/recent'
            );
            return data.data;
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useRetryFailedEmail(
    options?: UseMutationOptions<any, ApiError, { jobId: string }>
) {
    const queryClient = useQueryClient();

    return useMutation<any, ApiError, { jobId: string }>({
        mutationFn: async ({ jobId }) => {
            const { data } = await apiClient.post<{ success: boolean; data: any }>(
                `/admin/email-queue/retry/${jobId}`
            );
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.adminOps.all() });
            showSuccessToast('Email retry queued');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

