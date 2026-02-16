/**
 * NDR API Service
 * Handles admin NDR management and analytics
 */

import { apiClient } from '@/src/core/api/http';

// Types
export interface NdrStats {
    total: number;
    actionRequired: number;
    pendingSeller: number;
    rtoInitiated: number;
    resolutionRate: number;
}

export interface NdrItem {
    id: string;
    awb: string;
    orderId: string;
    sellerId: string;
    sellerName: string;
    customerName: string;
    courier: string;
    status: 'action_required' | 'pending_seller' | 'rto_initiated' | 'delivered' | 'rto_delivered';
    reason: string;
    attempts: number;
    lastAttemptDate: string;
    tat: string;
}

export interface NdrFunnelData {
    stage: string;
    count: number;
    percentage: number;
    fill: string;
}

export interface NdrFilters {
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    companyId?: string;
    page?: number;
    limit?: number;
}

export interface NdrListResponse {
    data: NdrItem[];
    stats: NdrStats;
    total: number;
    pages: number;
}

class NdrApiService {
    private sanitizeFilters(filters?: NdrFilters): NdrFilters | undefined {
        if (!filters) return filters;
        const normalized: NdrFilters = { ...filters };
        if (typeof normalized.search === 'string' && normalized.search.trim() === '') {
            delete normalized.search;
        }
        return normalized;
    }

    /**
     * Get admin NDR list with stats
     */
    async getAdminNDRList(filters?: NdrFilters): Promise<NdrListResponse> {
        const response = await apiClient.get('/admin/ndr/events', { params: this.sanitizeFilters(filters) });
        const payload = response.data?.data || {};
        const cases = Array.isArray(payload.cases) ? payload.cases : [];
        const pagination = payload.pagination || {};
        const statusCount = cases.reduce(
            (acc: Record<string, number>, item: any) => {
                const status = String(item?.status || '').toLowerCase();
                if (status) {
                    acc[status] = (acc[status] || 0) + 1;
                }
                return acc;
            },
            {}
        );
        const total = Number(pagination.total || 0);
        const resolved = Number(statusCount.resolved || 0);
        const rtoInitiated = Number(statusCount.rto_triggered || statusCount.converted_to_rto || 0);
        return {
            data: cases.map((item: any) => ({
                id: item._id,
                awb: item.shipmentId?.trackingNumber || 'N/A',
                orderId: item.orderId?._id || '',
                sellerId: item.companyId,
                sellerName: item.companyName || 'Unknown Seller',
                customerName: item.customerName || 'Unknown',
                courier: item.shipmentId?.carrier || 'Unknown',
                status: item.status,
                reason: item.primaryReason || 'other',
                attempts: item.currentAttempt?.attemptNumber || 0,
                lastAttemptDate: item.currentAttempt?.attemptDate || item.reportedAt,
                tat: `${item.daysSinceReported || 0}d`,
            })),
            stats: {
                total,
                actionRequired: Number(statusCount.detected || statusCount.open || 0),
                pendingSeller: Number(statusCount.in_progress || statusCount.in_resolution || 0),
                rtoInitiated,
                resolutionRate: total > 0 ? resolved / total : 0,
            },
            total,
            pages: Number(pagination.totalPages || 1),
        };
    }

    /**
     * Get NDR resolution funnel
     */
    async getFunnel(filters?: NdrFilters): Promise<NdrFunnelData[]> {
        const normalizedFilters = this.sanitizeFilters(filters);
        const [statsResponse, trendsResponse] = await Promise.all([
            apiClient.get('/admin/ndr/analytics/stats', { params: normalizedFilters }),
            apiClient.get('/admin/ndr/analytics/trends', { params: { ...normalizedFilters, groupBy: 'day' } }),
        ]);
        const metrics = statsResponse.data?.data || {};
        const trendRows = Array.isArray(trendsResponse.data?.data?.data)
            ? trendsResponse.data.data.data
            : [];
        const detected = Number(metrics.open || 0);
        const inProgress = Number(metrics.inProgress || 0);
        const resolved = Number(metrics.resolved || 0);
        const rto = Number(metrics.convertedToRTO || 0);
        const total = Math.max(1, detected + inProgress + resolved + rto);
        const latestTrendTotal = trendRows.reduce((sum: number, row: any) => sum + Number(row.count || 0), 0);

        return [
            {
                stage: 'Detected',
                count: detected || latestTrendTotal,
                percentage: ((detected || latestTrendTotal) / total) * 100,
                fill: '#3b82f6',
            },
            {
                stage: 'In Resolution',
                count: inProgress,
                percentage: (inProgress / total) * 100,
                fill: '#f59e0b',
            },
            {
                stage: 'Resolved',
                count: resolved,
                percentage: (resolved / total) * 100,
                fill: '#10b981',
            },
            {
                stage: 'RTO',
                count: rto,
                percentage: (rto / total) * 100,
                fill: '#ef4444',
            },
        ];
    }
    /**
     * Get NDR statistics
     */
    async getStats(filters?: NdrFilters): Promise<NdrStats> {
        const response = await apiClient.get('/ndr/analytics/stats', { params: filters });
        return response.data.data;
    }
}

export const ndrApi = new NdrApiService();
export default ndrApi;
