/**
 * Analytics API Hooks
 * 
 * React Query hooks for analytics, reporting, and data visualization.
 * Uses existing error-handler utilities and follows established patterns.
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import type {
    AnalyticsResponse,
    ReportConfiguration,
    ReportData,
    SavedReport,
    SLAPerformance,
    CourierComparison,
    CostAnalysis,
    DashboardMetrics,
    AnalyticsFilters,
    ExportRequest,
    ExportResponse,
    AdminDashboard,
    AdminDashboardFilters,
} from '@/src/types/api/analytics';
import { QUERY_CONFIG } from '../../config/query-client';

// Legacy analytics interface (keep for backward compatibility)
export interface AnalyticsData {
    revenue: number;
    orders: number;
    avgOrderValue: number;
    activeShipments: number;
    deliveryRate: number;
    rtoRate: number;
    revenueGrowth: number;
    ordersGrowth: number;
    topCouriers: Array<{ name: string; count: number; percentage: number }>;
    orderTrend: Array<{ date: string; orders: number; revenue: number }>;
    statusDistribution: Array<{ status: string; count: number; color: string }>;
}

// ==================== Dashboard ====================

/**
 * Legacy dashboard analytics (backward compatibility)
 */
export const useAnalytics = (
    params: { period?: '7d' | '30d' | '90d' | '1y' } = {},
    options?: UseQueryOptions<AnalyticsData, ApiError>
) => {
    const { period = '30d' } = params;

    return useQuery<AnalyticsData, ApiError>({
        queryKey: queryKeys.analytics.dashboard(period as any),
        queryFn: async () => {
            const response = await apiClient.get('/analytics/dashboard/seller', {
                params: { period },
            });
            return response.data.data as AnalyticsData;
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Get comprehensive dashboard metrics (seller/company-scoped)
 */
export function useDashboardMetrics(
    filters?: AnalyticsFilters,
    options?: UseQueryOptions<DashboardMetrics, ApiError>
) {
    return useQuery<DashboardMetrics, ApiError>({
        queryKey: queryKeys.analytics.dashboard(filters),
        queryFn: async () => {
            const { data } = await apiClient.get<AnalyticsResponse<DashboardMetrics>>(
                '/analytics/dashboard/metrics',
                { params: filters }
            );
            return data.data;
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        refetchInterval: 60 * 1000, // Refetch every minute
        ...options,
    });
}

/**
 * Get admin dashboard analytics (multi-company, admin only).
 * Uses GET /analytics/dashboard/admin with optional startDate/endDate.
 */
export function useAdminDashboard(
    filters?: AdminDashboardFilters,
    options?: UseQueryOptions<AdminDashboard, ApiError>
) {
    return useQuery<AdminDashboard, ApiError>({
        queryKey: queryKeys.analytics.adminDashboard(filters),
        queryFn: async () => {
            const { data } = await apiClient.get<AnalyticsResponse<AdminDashboard>>(
                '/analytics/dashboard/admin',
                { params: filters }
            );
            return data.data;
        },
        staleTime: CACHE_TIMES.SHORT.staleTime,
        gcTime: CACHE_TIMES.SHORT.gcTime,
        retry: RETRY_CONFIG.DEFAULT,
        refetchInterval: QUERY_CONFIG.refetchInterval.adminDashboard,
        ...options,
    });
}

// ==================== Custom Reports ====================

/**
 * Generate custom report
 */
export function useGenerateReport(
    options?: UseMutationOptions<ReportData, ApiError, ReportConfiguration>
) {
    return useMutation<ReportData, ApiError, ReportConfiguration>({
        mutationFn: async (config: ReportConfiguration) => {
            const { data } = await apiClient.post<AnalyticsResponse<ReportData>>(
                '/analytics/reports/generate',
                config
            );
            return data.data;
        },
        onError: (error) => handleApiError(error),
        onSuccess: () => showSuccessToast('Report generated successfully'),
        ...options,
    });
}

/**
 * Save report configuration
 */
export function useSaveReport(
    options?: UseMutationOptions<SavedReport, ApiError, ReportConfiguration>
) {
    const queryClient = useQueryClient();

    return useMutation<SavedReport, ApiError, ReportConfiguration>({
        mutationFn: async (config: ReportConfiguration) => {
            const { data } = await apiClient.post<AnalyticsResponse<SavedReport>>(
                '/analytics/reports/save',
                config
            );
            return data.data;
        },
        onError: (error) => handleApiError(error),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() });
            showSuccessToast('Report saved successfully');
        },
        ...options,
    });
}

/**
 * Get saved reports
 */
export function useSavedReports(
    options?: UseQueryOptions<SavedReport[], ApiError>
) {
    return useQuery<SavedReport[], ApiError>({
        queryKey: queryKeys.analytics.savedReports(),
        queryFn: async () => {
            const { data } = await apiClient.get<AnalyticsResponse<SavedReport[]>>(
                '/analytics/reports/saved'
            );
            return data.data;
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Delete saved report
 */
export function useDeleteReport(
    options?: UseMutationOptions<void, ApiError, string>
) {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, string>({
        mutationFn: async (reportId: string) => {
            await apiClient.delete(`/analytics/reports/${reportId}`);
        },
        onError: (error) => handleApiError(error),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() });
            showSuccessToast('Report deleted successfully');
        },
        ...options,
    });
}

// ==================== SLA Performance ====================

/**
 * Get SLA performance metrics
 */
export function useSLAPerformance(
    filters?: AnalyticsFilters,
    options?: UseQueryOptions<SLAPerformance, ApiError>
) {
    return useQuery<SLAPerformance, ApiError>({
        queryKey: queryKeys.analytics.sla(filters),
        queryFn: async () => {
            const { data } = await apiClient.get<AnalyticsResponse<SLAPerformance>>(
                '/analytics/sla',
                { params: filters }
            );
            return data.data;
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

// ==================== Courier Comparison ====================

/**
 * Get courier comparison metrics
 */
export function useCourierComparison(
    filters?: AnalyticsFilters,
    options?: UseQueryOptions<CourierComparison, ApiError>
) {
    return useQuery<CourierComparison, ApiError>({
        queryKey: queryKeys.analytics.courierComparison(filters),
        queryFn: async () => {
            const { data } = await apiClient.get<AnalyticsResponse<CourierComparison>>(
                '/analytics/courier-comparison',
                { params: filters }
            );
            return data.data;
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

// ==================== Cost Analysis ====================

/**
 * Get cost analysis
 */
export function useCostAnalysis(
    filters?: AnalyticsFilters,
    options?: UseQueryOptions<CostAnalysis, ApiError>
) {
    return useQuery<CostAnalysis, ApiError>({
        queryKey: queryKeys.analytics.cost(filters),
        queryFn: async () => {
            const { data } = await apiClient.get<AnalyticsResponse<CostAnalysis>>(
                '/analytics/cost',
                { params: filters }
            );
            return data.data;
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

// ==================== Export ====================

/**
 * Export report to file
 */
export function useExportReport(
    options?: UseMutationOptions<ExportResponse, ApiError, ExportRequest>
) {
    return useMutation<ExportResponse, ApiError, ExportRequest>({
        mutationFn: async (request: ExportRequest) => {
            const { data } = await apiClient.post<AnalyticsResponse<ExportResponse>>(
                '/analytics/export',
                request
            );
            return data.data;
        },
        onError: (error) => handleApiError(error),
        onSuccess: (data) => {
            showSuccessToast('Report exported successfully');
            if (data.downloadUrl) {
                window.open(data.downloadUrl, '_blank');
            }
        },
        ...options,
    });
}

export default useAnalytics;
