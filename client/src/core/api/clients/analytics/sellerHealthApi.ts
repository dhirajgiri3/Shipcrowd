/**
 * Seller Health API Service
 * Handles seller performance and health metrics
 */

import { apiClient } from '@/src/core/api/http';

// Types
export interface SellerHealthMetrics {
    revenue: number;
    revenueGrowth: number;
    orderVolume: number;
    volumeGrowth: number;
    rtoRate: number;
    ndrRate: number;
    avgDeliveryTime: number;
    customerSatisfaction: number;
}

export interface SellerHealth {
    sellerId: string;
    companyName: string;
    email: string;
    healthScore: number; // 0-100
    status: 'excellent' | 'good' | 'warning' | 'critical';
    metrics: SellerHealthMetrics;
    trends: {
        revenue: 'up' | 'down' | 'stable';
        orders: 'up' | 'down' | 'stable';
        performance: 'improving' | 'declining' | 'stable';
    };
    alerts: string[];
    lastUpdated: string;
}

export interface HealthFilters {
    status?: 'excellent' | 'good' | 'warning' | 'critical';
    metric?: 'revenue' | 'rtoRate' | 'healthScore';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface SellerHealthResponse {
    sellers: SellerHealth[];
    summary: {
        total: number;
        byStatus: Record<string, number>;
        avgHealthScore: number;
    };
}

class SellerHealthApiService {
    /**
     * Get seller health metrics
     */
    async getSellerHealth(filters?: HealthFilters): Promise<SellerHealthResponse> {
        const response = await apiClient.get('/admin/seller-health', { params: filters });
        return response.data;
    }

    /**
     * Get individual seller health details
     */
    async getSellerHealthDetails(sellerId: string): Promise<SellerHealth> {
        const response = await apiClient.get(`/admin/seller-health/${sellerId}`);
        return response.data;
    }

    /**
     * Refresh seller health metrics
     */
    async refreshHealthMetrics(sellerId: string): Promise<void> {
        await apiClient.post(`/admin/seller-health/${sellerId}/refresh`);
    }
}

export const sellerHealthApi = new SellerHealthApiService();
export default sellerHealthApi;
