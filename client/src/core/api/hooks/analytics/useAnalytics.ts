/**
 * Analytics API Hooks
 * 
 * React Query hooks for analytics, reporting, and data visualization.
 * Uses existing error-handler utilities and follows established patterns.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../client';
import { queryKeys } from '../../config/query-keys';
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
} from '@/src/types/api/analytics';

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
export const useAnalytics = (options: { period?: '7d' | '30d' | '90d' | '1y' } = {}) => {
    const { period = '30d' } = options;

    return useQuery<AnalyticsData>({
        queryKey: queryKeys.analytics.dashboard(period as any),
        queryFn: async () => {
            const response = await apiClient.get('/analytics/dashboard', {
                params: { period },
            });
            return response.data as AnalyticsData;
        },
        staleTime: 5 * 60 * 1000,
        retry: 2,
    });
};

/**
 * Get comprehensive dashboard metrics
 */
export function useDashboardMetrics(filters?: AnalyticsFilters) {
    return useQuery({
        queryKey: queryKeys.analytics.dashboard(filters),
        queryFn: async () => {
            const { data } = await apiClient.get<AnalyticsResponse<DashboardMetrics>>(
                '/analytics/dashboard/metrics',
                { params: filters }
            );
            return data.data;
        },
        staleTime: 5 * 60 * 1000,
        refetchInterval: 60 * 1000, // Refetch every minute
    });
}

// ==================== Custom Reports ====================

/**
 * Generate custom report
 */
export function useGenerateReport() {
    return useMutation({
        mutationFn: async (config: ReportConfiguration) => {
            const { data } = await apiClient.post<AnalyticsResponse<ReportData>>(
                '/analytics/reports/generate',
                config
            );
            return data.data;
        },
        onError: (error) => handleApiError(error, 'Failed to generate report'),
        onSuccess: () => showSuccessToast('Report generated successfully'),
    });
}

/**
 * Save report configuration
 */
export function useSaveReport() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (config: ReportConfiguration) => {
            const { data } = await apiClient.post<AnalyticsResponse<SavedReport>>(
                '/analytics/reports/save',
                config
            );
            return data.data;
        },
        onError: (error) => handleApiError(error, 'Failed to save report'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.analytics.savedReports() });
            showSuccessToast('Report saved successfully');
        },
    });
}

/**
 * Get saved reports
 */
export function useSavedReports() {
    return useQuery({
        queryKey: queryKeys.analytics.savedReports(),
        queryFn: async () => {
            const { data } = await apiClient.get<AnalyticsResponse<SavedReport[]>>(
                '/analytics/reports/saved'
            );
            return data.data;
        },
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Delete saved report
 */
export function useDeleteReport() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (reportId: string) => {
            await apiClient.delete(`/analytics/reports/${reportId}`);
        },
        onError: (error) => handleApiError(error, 'Failed to delete report'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.analytics.savedReports() });
            showSuccessToast('Report deleted');
        },
    });
}

// ==================== SLA Performance ====================

/**
 * Get SLA performance metrics
 */
export function useSLAPerformance(filters?: AnalyticsFilters) {
    return useQuery({
        queryKey: queryKeys.analytics.sla(filters),
        queryFn: async () => {
            const { data } = await apiClient.get<AnalyticsResponse<SLAPerformance>>(
                '/analytics/sla',
                { params: filters }
            );
            return data.data;
        },
        staleTime: 10 * 60 * 1000,
    });
}

// ==================== Courier Comparison ====================

/**
 * Get courier comparison metrics
 */
export function useCourierComparison(filters?: AnalyticsFilters) {
    return useQuery({
        queryKey: queryKeys.analytics.courierComparison(filters),
        queryFn: async () => {
            const { data } = await apiClient.get<AnalyticsResponse<CourierComparison>>(
                '/analytics/courier-comparison',
                { params: filters }
            );
            return data.data;
        },
        staleTime: 15 * 60 * 1000,
    });
}

// ==================== Cost Analysis ====================

/**
 * Get cost analysis
 */
export function useCostAnalysis(filters?: AnalyticsFilters) {
    return useQuery({
        queryKey: queryKeys.analytics.cost(filters),
        queryFn: async () => {
            const { data } = await apiClient.get<AnalyticsResponse<CostAnalysis>>(
                '/analytics/cost',
                { params: filters }
            );
            return data.data;
        },
        staleTime: 15 * 60 * 1000,
    });
}

// ==================== Export ====================

/**
 * Export report to file
 */
export function useExportReport() {
    return useMutation({
        mutationFn: async (request: ExportRequest) => {
            const { data } = await apiClient.post<AnalyticsResponse<ExportResponse>>(
                '/analytics/export',
                request
            );
            return data.data;
        },
        onError: (error) => handleApiError(error, 'Failed to export report'),
        onSuccess: (data) => {
            showSuccessToast('Report exported successfully');
            if (data.downloadUrl) {
                window.open(data.downloadUrl, '_blank');
            }
        },
    });
}

export default useAnalytics;
