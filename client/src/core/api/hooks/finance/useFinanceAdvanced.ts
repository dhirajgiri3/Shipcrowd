/**
 * Finance Advanced Features API Hooks
 *
 * React Query hooks for advanced financial analytics and forecasting
 * Backend: GET /api/v1/finance/*
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../http';
import { queryKeys } from '../../config/query-keys';

export interface AvailableBalance {
    currentBalance: number;
    pendingCredits: number;
    pendingDebits: number;
    availableBalance: number;
    currency: string;
    lastUpdated: string;
}

export interface CashFlowData {
    date: string;
    inflows: number;
    outflows: number;
    netChange: number;
    projectedBalance: number;
}

export interface CashFlowForecast {
    forecast: CashFlowData[];
    summary: {
        currentBalance: number;
        projectedBalance7Days: number;
        totalInflows: number;
        totalOutflows: number;
        lowBalanceWarning: boolean;
        warningDate: string | null;
    };
    averages: {
        dailyInflow: number;
        dailyOutflow: number;
    };
}

export interface SpendingInsight {
    category: string;
    spent: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
    recommendation?: string;
}

export interface FinancialInsights {
    topSpendingCategories: SpendingInsight[];
    costOptimizations: Array<{
        title: string;
        description: string;
        potentialSavings: number;
    }>;
    recommendations: string[];
}

/**
 * Get available balance with breakdown
 * GET /finance/wallet/available-balance
 */
export const useAvailableBalance = (options?: any) => {
    return useQuery({
        queryKey: queryKeys.finance.availableBalance(),
        queryFn: async () => {
            const response = await apiClient.get<{ data: AvailableBalance }>(
                '/finance/wallet/available-balance'
            );
            return response.data.data;
        },
        staleTime: 15 * 1000,
        ...options,
    });
};

/**
 * Get cash flow forecast
 * GET /finance/wallet/cash-flow-forecast
 */
export const useCashFlowForecast = (options?: any) => {
    return useQuery<CashFlowForecast>({
        queryKey: queryKeys.finance.cashFlowForecast(),
        queryFn: async () => {
            const response = await apiClient.get<{ data: CashFlowForecast }>(
                '/finance/wallet/cash-flow-forecast'
            );
            return response.data.data;
        },
        staleTime: 60 * 1000,
        ...options,
    });
};

/**
 * Get spending insights and recommendations
 * GET /finance/wallet/insights
 */
export const useFinancialInsights = (options?: any) => {
    return useQuery({
        queryKey: queryKeys.finance.insights(),
        queryFn: async () => {
            const response = await apiClient.get<{ data: FinancialInsights }>(
                '/finance/wallet/insights'
            );
            return response.data.data;
        },
        staleTime: 300 * 1000, // 5 minutes
        ...options,
    });
};

/**
 * Transform API cash flow data to component format
 */
export const transformCashFlowToComponent = (data: CashFlowForecast, currentBalance: number = 0) => {
    // Current running balance
    let runningBalance = currentBalance;

    const forecast = data.forecast?.map(d => {
        // Update running balance (using backend provided netChange)
        const change = d.netChange ?? 0;
        runningBalance += change;

        return {
            date: d.date,
            inflows: (d.inflows ?? 0) > 0 ? [{
                type: 'other' as const,
                amount: d.inflows,
                source: 'Aggregated Inflow'
            }] : [],
            outflows: (d.outflows ?? 0) > 0 ? [{
                type: 'other' as const,
                amount: d.outflows,
                estimated: true
            }] : [],
            netChange: change,
            endingBalance: runningBalance
        };
    }) || [];

    // Generate basic alerts based on forecast
    const alerts: Array<{
        type: 'low_balance' | 'large_inflow' | 'high_outflow';
        date: string;
        message: string;
    }> = [];

    forecast.forEach(d => {
        if (d.endingBalance < 1000) {
            alerts.push({
                type: 'low_balance',
                date: d.date,
                message: `Projected balance drops to ${d.endingBalance}`
            });
        }
    });

    // Use summary data from backend if available, otherwise default
    const projectedBalance = data.summary?.projectedBalance7Days ?? runningBalance;

    return {
        currentBalance,
        forecast,
        projectedBalance: projectedBalance,
        alerts
    };
};
