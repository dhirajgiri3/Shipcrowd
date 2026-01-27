import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/src/core/api/http';
import { useToast } from '@/src/components/ui/feedback/Toast';

interface BulkUpdateInput {
    rateCardIds: string[];
    operation: 'activate' | 'deactivate' | 'adjust_price';
    adjustmentType?: 'percentage' | 'fixed';
    adjustmentValue?: number;
}

export const useBulkUpdateRateCards = () => {
    const queryClient = useQueryClient();
    const { addToast } = useToast();

    return useMutation({
        mutationFn: async (data: BulkUpdateInput) => {
            const response = await apiClient.post('/rate-cards/bulk-update', data);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['rate-cards'] });
            addToast(`Successfully updated ${data.data.updatedCount} rate cards`, 'success');
        },
        onError: (error: any) => {
            addToast(error?.response?.data?.message || 'Failed to update rate cards', 'error');
        }
    });
};

export const useExportRateCards = () => {
    const { addToast } = useToast();

    return useMutation({
        mutationFn: async () => {
            const response = await apiClient.get('/rate-cards/export', {
                responseType: 'blob'
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `rate-cards-${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            return response.data;
        },
        onSuccess: () => {
            addToast('Rate cards exported successfully', 'success');
        },
        onError: (error: any) => {
            addToast(error?.response?.data?.message || 'Failed to export rate cards', 'error');
        }
    });
};
