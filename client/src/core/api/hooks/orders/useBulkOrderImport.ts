import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../client';
import { queryKeys } from '../../config/query-keys';
import { RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

export interface BulkImportResult {
    successCount?: number;
    failedCount?: number;
    errors?: Array<{ row?: number; message: string }>;
    batchId?: string;
}

export function useBulkOrderImport(
    options?: UseMutationOptions<BulkImportResult, ApiError, { file: File }>
) {
    const queryClient = useQueryClient();

    return useMutation<BulkImportResult, ApiError, { file: File }>({
        mutationFn: async ({ file }) => {
            const formData = new FormData();
            formData.append('file', file);

            const { data } = await apiClient.post<{ success: boolean; data: BulkImportResult }>(
                '/orders/bulk',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });
            showSuccessToast('Bulk import started');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

