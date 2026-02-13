/**
 * NDR (Non-Delivery Report) React Query Hooks
 * 
 * Custom hooks for NDR operations:
 * - Fetch NDR cases with filters
 * - Get individual NDR case details
 * - Take actions on NDR cases
 * - Bulk operations
 * - Analytics and metrics
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '@/src/core/api/http';
import { ApiError } from '@/src/core/api/http';
import { CACHE_TIMES, RETRY_CONFIG } from '@/src/core/api/config/cache.config';
import { queryKeys } from '@/src/core/api/config/query-keys';
import type {
    NDRCase,
    NDRFilters,
    NDRListResponse,
    TakeNDRActionPayload,
    BulkNDRActionPayload,
    NDRMetrics,
    NDRAnalytics,
    NDRSettings,
    NDRSelfServiceMetrics,
    NDRPreventionMetrics,
    NDRROIMetrics,
    NDRWeeklyTrends,
} from '@/src/types/api/orders';

interface ApiEnvelope<T> {
    success?: boolean;
    data?: T | { data?: T };
    message?: string;
}

const unwrapApiData = <T>(payload: ApiEnvelope<T> | T): T => {
    if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)) {
        const firstLevel = (payload as ApiEnvelope<T>).data;
        if (
            firstLevel &&
            typeof firstLevel === 'object' &&
            'data' in (firstLevel as Record<string, unknown>) &&
            Object.keys(firstLevel as Record<string, unknown>).length === 1
        ) {
            return (firstLevel as { data?: T }).data as T;
        }
        return firstLevel as T;
    }
    return payload as T;
};

const normalizeResolutionRate = (value: number): number => {
    if (!Number.isFinite(value) || value <= 0) return 0;
    return value > 1 ? value / 100 : value;
};

// ==================== Queries ====================

/**
 * Fetch NDR cases with filters
 */
export function useNDRCases(filters?: NDRFilters, options?: UseQueryOptions<NDRListResponse, ApiError>) {
    return useQuery<NDRListResponse, ApiError>({
        queryKey: queryKeys.ndr.list(filters),
        queryFn: async () => {
            const response = await apiClient.get<ApiEnvelope<NDRListResponse>>('/ndr/events', {
                params: filters,
            });
            return unwrapApiData<NDRListResponse>(response.data);
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Fetch single NDR case by ID
 */
export function useNDRCase(caseId: string, options?: UseQueryOptions<NDRCase, ApiError>) {
    return useQuery<NDRCase, ApiError>({
        queryKey: queryKeys.ndr.detail(caseId),
        queryFn: async () => {
            const response = await apiClient.get<ApiEnvelope<NDRCase>>(`/ndr/events/${caseId}`);
            return unwrapApiData<NDRCase>(response.data);
        },
        enabled: !!caseId,
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Fetch NDR metrics
 */
export function useNDRMetrics() {
    return useQuery<NDRMetrics>({
        queryKey: queryKeys.ndr.metrics(),
        queryFn: async () => {
            const response = await apiClient.get<ApiEnvelope<NDRMetrics>>('/ndr/analytics/stats');
            const metrics = unwrapApiData<NDRMetrics>(response.data);
            return {
                ...metrics,
                resolutionRate: normalizeResolutionRate(metrics.resolutionRate),
            };
        },
    });
}

/**
 * Fetch NDR analytics
 */
export function useNDRAnalytics(filters?: { startDate?: string; endDate?: string }) {
    return useQuery<NDRAnalytics>({
        queryKey: queryKeys.ndr.analytics(filters),
        queryFn: async () => {
            const [statsRes, reasonsRes, ratesRes, trendsRes] = await Promise.all([
                apiClient.get<ApiEnvelope<NDRMetrics>>('/ndr/analytics/stats', { params: filters }),
                apiClient.get<ApiEnvelope<Array<{ reason: string; count: number; percentage: number }>>>('/ndr/analytics/top-reasons', { params: filters }),
                apiClient.get<ApiEnvelope<Record<string, { total: number; successful: number; rate: number }>>>('/ndr/analytics/resolution-rates', { params: filters }),
                apiClient.get<ApiEnvelope<Array<{ date: string; count: number; resolved: number; rtoTriggered: number }>>>('/ndr/analytics/trends', { params: filters }),
            ]);

            const metrics = unwrapApiData<NDRMetrics>(statsRes.data);
            const topReasons = unwrapApiData<Array<{ reason: string; count: number; percentage: number }>>(reasonsRes.data) || [];
            const ratesByAction = unwrapApiData<Record<string, { total: number; successful: number; rate: number }>>(ratesRes.data) || {};
            const trends = unwrapApiData<Array<{ date: string; count: number; resolved: number; rtoTriggered: number }>>(trendsRes.data) || [];

            const total = metrics?.total || 0;
            const resolutionRate = normalizeResolutionRate(metrics?.resolutionRate || 0);
            const slaBreachRate = total > 0 ? (metrics.slaBreach || 0) / total : 0;
            const rtoConversionRate = total > 0 ? (metrics.convertedToRTO || 0) / total : 0;

            return {
                stats: {
                    totalCases: total,
                    resolutionRate,
                    averageResolutionTime: metrics.averageResolutionTime || 0,
                    slaBreachRate,
                    rtoConversionRate,
                },
                reasonBreakdown: topReasons.map((reason) => ({
                    reason: reason.reason as any,
                    count: reason.count,
                    percentage: reason.percentage,
                })),
                actionEffectiveness: Object.entries(ratesByAction).map(([action, row]) => ({
                    action: action as any,
                    totalAttempts: row.total || 0,
                    successRate: normalizeResolutionRate(row.rate || 0),
                    averageTime: 0,
                })),
                communicationStats: {
                    smsDeliveryRate: 0,
                    emailOpenRate: 0,
                    whatsappDeliveryRate: 0,
                    customerResponseRate: 0,
                },
                trends: trends.map((row) => ({
                    date: row.date,
                    created: row.count,
                    resolved: row.resolved,
                    rtoConverted: row.rtoTriggered,
                })),
            };
        },
    });
}

/**
 * Fetch NDR settings
 */
export function useNDRSettings() {
    return useQuery({
        queryKey: queryKeys.ndr.settings(),
        queryFn: async () => {
            // Settings are not yet implemented in backend, using default
            return { autoEscalation: true, notificationChannels: ['sms', 'email'] } as any;
        },
    });
}

// Phase 6: Enhanced Analytics Hooks

/**
 * Fetch Customer Self-Service Metrics
 */
export function useNDRSelfServiceMetrics(filters?: { startDate?: string; endDate?: string }) {
    return useQuery<NDRSelfServiceMetrics>({
        queryKey: queryKeys.ndr.selfService(filters),
        queryFn: async () => {
            const response = await apiClient.get<ApiEnvelope<NDRSelfServiceMetrics>>('/ndr/analytics/self-service', {
                params: filters,
            });
            return unwrapApiData<NDRSelfServiceMetrics>(response.data);
        },
    });
}

/**
 * Fetch Prevention Metrics
 */
export function useNDRPreventionMetrics(filters?: { startDate?: string; endDate?: string }) {
    return useQuery<NDRPreventionMetrics>({
        queryKey: queryKeys.ndr.prevention(filters),
        queryFn: async () => {
            const response = await apiClient.get<ApiEnvelope<NDRPreventionMetrics>>('/ndr/analytics/prevention', {
                params: filters,
            });
            return unwrapApiData<NDRPreventionMetrics>(response.data);
        },
    });
}

/**
 * Fetch ROI Metrics
 */
export function useNDRROIMetrics(filters?: { startDate?: string; endDate?: string }) {
    return useQuery<NDRROIMetrics>({
        queryKey: queryKeys.ndr.roi(filters),
        queryFn: async () => {
            const response = await apiClient.get<ApiEnvelope<NDRROIMetrics>>('/ndr/analytics/roi', {
                params: filters,
            });
            return unwrapApiData<NDRROIMetrics>(response.data);
        },
    });
}

/**
 * Fetch Weekly Trends
 */
export function useNDRWeeklyTrends(weeks: number = 4) {
    return useQuery<NDRWeeklyTrends>({
        queryKey: queryKeys.ndr.weeklyTrends(weeks),
        queryFn: async () => {
            const response = await apiClient.get<ApiEnvelope<NDRWeeklyTrends>>('/ndr/analytics/weekly-trends', {
                params: { weeks },
            });
            return unwrapApiData<NDRWeeklyTrends>(response.data);
        },
    });
}

// ==================== Mutations ====================

/**
 * Take action on an NDR case
 */
export function useTakeNDRAction() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ caseId, payload }: { caseId: string; payload: TakeNDRActionPayload }) => {
            const response = await apiClient.post<ApiEnvelope<NDRCase>>(
                `/ndr/events/${caseId}/action`,
                payload
            );
            return unwrapApiData<NDRCase>(response.data);
        },
        onSuccess: (_, variables) => {
            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: queryKeys.ndr.list() });
            queryClient.invalidateQueries({ queryKey: queryKeys.ndr.detail(variables.caseId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.ndr.metrics() });
        },
    });
}

/**
 * Bulk action on multiple NDR cases
 */
export function useBulkNDRAction() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: BulkNDRActionPayload) => {
            // Bulk action not yet implemented in backend
            // const { data } = await apiClient.post('/ndr/events/bulk-action', payload);
            return { success: true, message: 'Bulk action simulated (backend pending)' };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.ndr.list() });
            queryClient.invalidateQueries({ queryKey: queryKeys.ndr.metrics() });
        },
    });
}

/**
 * Escalate NDR case to admin
 */
export function useEscalateNDR() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ caseId, reason }: { caseId: string; reason: string }) => {
            const response = await apiClient.post<ApiEnvelope<null>>(
                `/ndr/events/${caseId}/escalate`,
                { reason }
            );
            return unwrapApiData<null>(response.data);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.ndr.list() });
            queryClient.invalidateQueries({ queryKey: queryKeys.ndr.detail(variables.caseId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.ndr.metrics() });
        },
    });
}

/**
 * Update NDR settings
 */
export function useUpdateNDRSettings() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (settings: Partial<NDRSettings>) => {
            // Settings not implemented
            // const { data } = await apiClient.patch<NDRSettings>('/ndr/settings', settings);
            return settings as any;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.ndr.settings() });
        },
    });
}

/**
 * Manually send customer communication
 */
export function useSendNDRCommunication() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            caseId,
            channel,
            template
        }: {
            caseId: string;
            channel: 'sms' | 'email' | 'whatsapp';
            template: string;
        }) => {
            const response = await apiClient.post(
                `/ndr/communication/${caseId}/notify`,
                { channel, template }
            );
            return unwrapApiData(response.data);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.ndr.detail(variables.caseId) });
        },
    });
}
