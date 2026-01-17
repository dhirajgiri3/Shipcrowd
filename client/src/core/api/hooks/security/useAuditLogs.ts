import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../config/client';
import { queryKeys } from '../../config/queryKeys';
import { showSuccessToast } from '@/src/lib/error';
import { handleApiError } from '@/src/lib/error';
import type { AuditLog } from '@/src/types/api/settings';

interface AuditLogsQuery {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    action?: string;
    entity?: string;
}

interface ExportAuditLogsRequest {
    format: 'csv' | 'json' | 'pdf';
    startDate?: string;
    endDate?: string;
    filters?: Partial<AuditLogsQuery>;
}

/**
 * Fetch audit logs with pagination and filters
 */
export const useAuditLogs = (query: AuditLogsQuery = {}) => {
    return useQuery({
        queryKey: queryKeys.settings.auditLogs(query),
        queryFn: async () => {
            const response = await apiClient.get<{ data: { logs: AuditLog[]; total: number } }>('/audit-logs', {
                params: query,
            });
            return response.data.data;
        },
    });
};

/**
 * Export audit logs
 */
export const useExportAuditLogs = () => {
    return useMutation({
        mutationFn: async (request: ExportAuditLogsRequest) => {
            const response = await apiClient.post('/audit-logs/export', request, {
                responseType: 'blob',
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `audit-logs-${Date.now()}.${request.format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            return response.data;
        },
        onSuccess: () => {
            showSuccessToast('Audit logs exported successfully');
        },
        onError: (error: any) => {
            handleApiError(error, 'Failed to export audit logs');
        },
    });
};
