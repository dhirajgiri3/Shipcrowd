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

// CashFlowForecast component interface (what component expects)
interface CashFlowDay {
    date: string;
    inflows: {
        type: 'cod_settlement' | 'refund' | 'other';
        amount: number;
        source?: string;
    }[];
    outflows: {
        type: 'shipping_costs' | 'wallet_deduction' | 'fees' | 'other';
        amount: number;
        estimated?: boolean;
    }[];
    netChange: number;
    endingBalance: number;
}

interface CashFlowAlert {
    type: 'low_balance' | 'large_inflow' | 'high_outflow';
    date: string;
    message: string;
}

export interface CashFlowForecastData {
    currentBalance: number;
    forecast: CashFlowDay[];
    projectedBalance: number;
    alerts: CashFlowAlert[];
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

// Transform API response to CashFlowForecast component format
export function transformCashFlowToComponent(data: CashFlowForecastResponse): CashFlowForecastData {
    const forecast: CashFlowDay[] = data.forecast.map(day => {
        // Convert simple numbers to detailed arrays
        const inflows: CashFlowDay['inflows'] = day.inflows > 0 ? [{
            type: 'cod_settlement',
            amount: day.inflows,
            source: 'COD Settlement'
        }] : [];

        const outflows: CashFlowDay['outflows'] = day.outflows > 0 ? [{
            type: 'shipping_costs',
            amount: day.outflows,
            estimated: true
        }] : [];

        return {
            date: day.date,
            inflows,
            outflows,
            netChange: day.netChange,
            endingBalance: day.projectedBalance
        };
    });

    // Generate alerts if low balance warning exists
    const alerts: CashFlowAlert[] = [];
    if (data.summary.lowBalanceWarning && data.summary.warningDate) {
        const warningDate = new Date(data.summary.warningDate);
        alerts.push({
            type: 'low_balance',
            date: data.summary.warningDate,
            message: `Balance will drop below threshold on ${warningDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}. Consider recharging.`
        });
    }

    return {
        currentBalance: data.summary.currentBalance,
        forecast,
        projectedBalance: data.summary.projectedBalance7Days,
        alerts
    };
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
