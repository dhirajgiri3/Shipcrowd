import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import { queryKeys } from '../queryKeys';
import { toast } from 'sonner';

// Types
interface AuditLog {
    _id: string;
    action: string;
    entity: string;
    entityId: string;
    userId: string;
    userName: string;
    timestamp: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
}

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
            toast.success('Audit logs exported successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to export audit logs');
        },
    });
};
