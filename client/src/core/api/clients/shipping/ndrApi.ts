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
    dateFrom?: string;
    dateTo?: string;
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
    /**
     * Get admin NDR list with stats
     */
    async getAdminNDRList(filters?: NdrFilters): Promise<NdrListResponse> {
        const response = await apiClient.get('/admin/ndr', { params: filters });
        return response.data;
    }

    /**
     * Get NDR resolution funnel
     */
    async getFunnel(filters?: NdrFilters): Promise<NdrFunnelData[]> {
        const response = await apiClient.get('/admin/ndr/funnel', { params: filters });
        return response.data;
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
