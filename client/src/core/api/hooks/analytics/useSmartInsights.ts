import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5005/api/v1";

/**
 * Smart Insights Hook - Phase 5: 100% Real Data
 *
 * Revolutionary AI-powered business intelligence that analyzes:
 * - Cost optimization opportunities (courier comparison by zone)
 * - RTO prevention strategies (pattern analysis + recommendations)
 * - Efficiency improvements (delivery time optimization)
 * - Growth opportunities (underserved markets)
 *
 * ALL insights are backed by REAL transaction data - no estimates!
 */

export interface SmartInsight {
    id: string;
    type: 'cost_saving' | 'rto_prevention' | 'efficiency' | 'speed' | 'growth_opportunity';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: {
        metric: string;
        value: number;
        period: 'day' | 'week' | 'month';
        formatted: string;
    };
    data: Record<string, any>; // Supporting data for transparency
    action: {
        type: 'auto_apply' | 'manual' | 'enable_feature';
        label: string;
        endpoint?: string;
        payload?: Record<string, any>;
        confirmMessage?: string;
        costImpact?: string;
    };
    socialProof: string;
    confidence: number; // 0-100
    projectedImpact?: {
        savings?: number;
        reduction?: number;
        improvement?: number;
        additionalCost?: number;
    };
    createdAt: string;
}

export function useSmartInsights() {
    return useQuery({
        queryKey: ["smart-insights"],
        queryFn: async () => {
            const { data } = await axios.get<{ success: boolean; data: SmartInsight[] }>(
                `${API_BASE_URL}/analytics/insights`,
                { withCredentials: true }
            );
            return data.data;
        },
        // Cache for 1 hour - insights are computationally expensive
        // and business patterns don't change frequently
        staleTime: 60 * 60 * 1000,
        gcTime: 2 * 60 * 60 * 1000,
    });
}
