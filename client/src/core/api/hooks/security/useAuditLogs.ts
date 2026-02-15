import { useMutation, useQuery, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { showSuccessToast, handleApiError } from '@/src/lib/error';
import type { AuditLog } from '@/src/types/api/settings';

interface AuditLogsQuery {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    action?: string;
    entity?: string;
    resource?: string;
    search?: string;
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
export const useAuditLogs = (query: AuditLogsQuery = {}, options?: UseQueryOptions<{ logs: AuditLog[]; total: number }, ApiError>) => {
    return useQuery<{ logs: AuditLog[]; total: number }, ApiError>({
        queryKey: queryKeys.settings.auditLogs(query),
        queryFn: async () => {
            const params = {
                ...query,
                entity: query.entity || query.resource,
            };
            const response = await apiClient.get<{ data: { data: AuditLog[]; pagination: { total: number } } }>('/audit/company', {
                params,
            });
            const mappedLogs: AuditLog[] = response.data.data.data.map((log: any) => ({
                _id: String(log.id || log._id || ''),
                userId: String(log.user?._id || log.userId || ''),
                userName: log.user?.name || '',
                userEmail: log.user?.email || '',
                action: log.action,
                entity: log.resource,
                entityId: log.resourceId ? String(log.resourceId) : '',
                details: log.details || {},
                ipAddress: log.ipAddress || '',
                userAgent: log.userAgent || '',
                timestamp: log.timestamp || '',
            }));
            return {
                logs: mappedLogs,
                total: response.data.data.pagination.total,
            };
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Export audit logs
 */
export const useExportAuditLogs = (options?: UseMutationOptions<any, ApiError, ExportAuditLogsRequest>) => {
    return useMutation<any, ApiError, ExportAuditLogsRequest>({
        mutationFn: async (request: ExportAuditLogsRequest) => {
            const response = await apiClient.post('/audit/company/export', request, {
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
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.NO_RETRY,
        ...options,
    });
};
