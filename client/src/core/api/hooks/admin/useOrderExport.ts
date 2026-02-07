
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/src/core/api/http';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

interface ExportOrdersRequest {
    dataType: 'orders';
    filters?: {
        startDate?: string;
        endDate?: string;
        status?: string[];
        warehouse?: string;
        search?: string;
    };
}

interface ExportResponse {
    success: boolean;
    data: {
        downloadUrl?: string; // If using Spaces/S3
        filename?: string;
        recordCount: number;
    };
    message: string;
}

export const useOrderExport = () => {
    return useMutation<
        void, // We handle the blob download manually if not using signed URL
        Error,
        ExportOrdersRequest
    >({
        mutationFn: async (payload) => {
            // 1. Try to get signed URL if configured
            // For now, we'll assume the backend might return a stream or a URL
            // If the backend is designed to return a stream directly for simpler setup:

            const response = await apiClient.post('/analytics/export/csv', payload, {
                responseType: 'blob', // Important for direct file download
                headers: {
                    'Accept': 'text/csv'
                }
            });

            // Handle Blob Download
            const blob = new Blob([response.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            // Try to extract filename from headers or default
            const contentDisposition = response.headers['content-disposition'];
            let filename = `orders_export_${new Date().toISOString().split('T')[0]}.csv`;

            if (contentDisposition) {
                const matches = /filename="([^"]*)"/.exec(contentDisposition);
                if (matches != null && matches[1]) {
                    filename = matches[1];
                }
            }

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        },
        onSuccess: () => {
            showSuccessToast('Export downloaded successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Failed to export orders');
        }
    });
};
