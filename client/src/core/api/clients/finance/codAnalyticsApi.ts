import { apiClient } from '@/src/core/api/http';

export interface CashFlowForecast {
    daily: {
        date: string;
        expectedCOD: number;
        riskAdjusted: number;
    }[];
    total: {
        expectedCOD: number;
        riskAdjusted: number;
        confidence: number;
    };
}

export interface HealthMetrics {
    totalOrders: number;
    rtoRate: number;
    disputeRate: number;
    collectionRate: number;
    averageRemittanceTime: number;
}

export interface CarrierPerformance {
    carrier: string;
    metrics: {
        rtoRate: number;
        disputeRate: number;
        avgRemittanceTime: number;
    };
}

class CODAnalyticsApiService {
    /**
     * Get Cash Flow Forecast
     * @param days Number of days to forecast (default 7)
     */
    async getForecast(days: number = 7): Promise<CashFlowForecast> {
        const response = await apiClient.get('/finance/cod/analytics/forecast', { params: { days } });
        return response.data;
    }

    /**
     * Get Health Metrics
     * @param period Number of days to analyze (default 30)
     */
    async getHealthMetrics(period: number = 30): Promise<HealthMetrics> {
        const response = await apiClient.get('/finance/cod/analytics/health', { params: { period } });
        return response.data;
    }

    /**
     * Get Carrier Performance
     * @param days Number of days to analyze (default 30)
     */
    async getCarrierPerformance(days: number = 30): Promise<CarrierPerformance[]> {
        const response = await apiClient.get('/finance/cod/analytics/carrier-performance', { params: { days } });
        return response.data;
    }
}

export const codAnalyticsApi = new CODAnalyticsApiService();
export default codAnalyticsApi;
