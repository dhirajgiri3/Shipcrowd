import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { ApiError } from '../../http';
import { orderApi } from '../../clients/orderApi';
import { queryKeys } from '../../config/query-keys';
import { RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

export interface BulkImportResponse {
    success: boolean;
    data: {
        created: Array<{ orderNumber: string; id: string }>;
        errors: Array<{ row: number; error: string }>;
        imported: number;
        failed: number;
    };
}

export function useBulkOrderImport(
    options?: UseMutationOptions<BulkImportResponse, ApiError, File>
) {
    const queryClient = useQueryClient();

    return useMutation<BulkImportResponse, ApiError, File>({
        mutationFn: (file) => orderApi.bulkImportOrders(file),
        ...options,
        onSuccess: (data, variables, context) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });

            if (data.success) {
                showSuccessToast(`Imported ${data.data.imported || 0} orders successfully`);
            }

            // Call user defined onSuccess if exists
            // Using 'as any' to bypass potential type mismatch in v5 definitions where onSuccess might have different signature in types
            if (options?.onSuccess) {
                (options.onSuccess as any)(data, variables, context);
            }
        },
        onError: (error, variables, context) => {
            handleApiError(error, 'Bulk Import Failed');
            if (options?.onError) {
                (options.onError as any)(error, variables, context);
            }
        },
        retry: RETRY_CONFIG.DEFAULT,
    });
}
