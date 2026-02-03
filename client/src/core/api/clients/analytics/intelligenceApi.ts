/**
 * Intelligence API Service
 * Handles AI predictions, anomaly detection, and insights
 */

import { apiClient } from '@/src/core/api/http';

// Types
export interface AIPrediction {
    id: string;
    type: 'demand' | 'capacity' | 'pricing' | 'route_optimization';
    title: string;
    description: string;
    confidence: number;
    expectedImpact: {
        metric: string;
        value: number;
        unit: string;
    };
    recommendation: string;
    createdAt: string;
}

export interface Anomaly {
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'cost' | 'delivery' | 'volume' | 'quality';
    title: string;
    description: string;
    affectedMetric: string;
    deviation: number;
    detectedAt: string;
    status: 'new' | 'investigating' | 'resolved' | 'ignored';
}

export interface AIInsight {
    id: string;
    category: 'efficiency' | 'cost_saving' | 'customer_satisfaction' | 'growth';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    impact: 'Low' | 'Medium' | 'High';
    action: string;
    potentialSavings?: number;
    actionItems: string[];
    createdAt: string;
}

export interface PredictionsResponse {
    predictions: AIPrediction[];
    meta: {
        generatedAt: string;
        modelVersion: string;
    };
}

export interface AnomaliesResponse {
    anomalies: Anomaly[];
    summary: {
        total: number;
        bySeverity: Record<string, number>;
        byCategory: Record<string, number>;
    };
}

export interface InsightsResponse {
    insights: AIInsight[];
    totalPotentialSavings: number;
}

export interface DemandForecastPoint {
    date: string;
    predicted: number;
    actual: number;
    confidence?: number;
}

export interface DemandForecastResponse {
    forecast: DemandForecastPoint[];
    modelVersion: string;
    accuracy: number;
}

class IntelligenceApiService {
    /**
     * Get AI predictions
     */
    async getPredictions(): Promise<PredictionsResponse> {
        const response = await apiClient.get('/admin/intelligence/predictions');
        return response.data;
    }

    /**
     * Get anomaly detection results
     */
    async getAnomalies(): Promise<AnomaliesResponse> {
        const response = await apiClient.get('/admin/intelligence/anomalies');
        return response.data;
    }

    /**
     * Get AI-generated insights
     */
    async getInsights(): Promise<InsightsResponse> {
        const response = await apiClient.get('/admin/intelligence/insights');
        return response.data;
    }

    /**
     * Update anomaly status
     */
    async updateAnomalyStatus(anomalyId: string, status: string): Promise<void> {
        await apiClient.patch(`/admin/intelligence/anomalies/${anomalyId}`, { status });
    }

    /**
     * Get demand forecast time-series data
     */
    async getDemandForecast(days: number = 30): Promise<DemandForecastResponse> {
        const response = await apiClient.get('/admin/intelligence/demand-forecast', {
            params: { days }
        });
        return response.data;
    }
}

export const intelligenceApi = new IntelligenceApiService();
export default intelligenceApi;
