/**
 * Analytics API Service
 * Handles admin analytics and reporting
 */

import { apiClient } from '../http';

// Types
export interface DateRange {
    startDate: string;
    endDate: string;
}

export interface DeliveryPerformanceData {
    date: string;
    delivered: number;
    rto: number;
    ndr: number;
}

export interface ZoneDistribution {
    name: string;
    value: number;
}

export interface DeliveryPerformanceResponse {
    data: DeliveryPerformanceData[];
    totals: {
        delivered: number;
        rto: number;
        ndr: number;
    };
}

export interface ZoneDistributionResponse {
    data: ZoneDistribution[];
}

class AnalyticsApiService {
    /**
     * Get delivery performance metrics
     */
    async getDeliveryPerformance(dateRange: DateRange): Promise<DeliveryPerformanceResponse> {
        const response = await apiClient.get('/admin/analytics/delivery-performance', {
            params: {
                from: dateRange.startDate,
                to: dateRange.endDate
            }
        });
        return response.data;
    }

    /**
     * Get zone-wise distribution
     */
    async getZoneDistribution(): Promise<ZoneDistributionResponse> {
        const response = await apiClient.get('/admin/analytics/zone-distribution');
        return response.data;
    }
}

export const analyticsApi = new AnalyticsApiService();
export default analyticsApi;
