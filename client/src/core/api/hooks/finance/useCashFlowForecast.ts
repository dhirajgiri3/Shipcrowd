import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5005/api/v1";

/**
 * Cash Flow Forecast Hook
 * 
 * Provides 7-day projection based on 30-day transaction history:
 * - Daily inflows (COD settlements, recharges)
 * - Daily outflows (shipping costs, RTO charges)
 * - Projected balance with low balance warnings
 */

export interface CashFlowForecastDay {
    date: string;
    inflows: number;
    outflows: number;
    netChange: number;
    projectedBalance: number;
}

export interface CashFlowForecastResponse {
    forecast: CashFlowForecastDay[];
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

export function useCashFlowForecast() {
    return useQuery({
        queryKey: ["cash-flow-forecast"],
        queryFn: async () => {
            const { data } = await axios.get<{ success: boolean; data: CashFlowForecastResponse }>(
                `${API_BASE_URL}/finance/wallet/cash-flow-forecast`,
                { withCredentials: true }
            );
            return data.data;
        },
        // Cache for 10 minutes (forecast doesn't change rapidly)
        staleTime: 10 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
    });
}

// Helper to format forecast for CashFlowForecast component
export function transformForecastToChartData(data: CashFlowForecastResponse) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return data.forecast.map(day => {
        const date = new Date(day.date);
        return {
            day: dayNames[date.getDay()],
            date: day.date,
            inflow: day.inflows,
            outflow: day.outflows,
            balance: day.projectedBalance
        };
    });
}
