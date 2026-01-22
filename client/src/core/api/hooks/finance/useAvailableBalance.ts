import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5005/api/v1";

/**
 * Phase 2: Available Balance Hook
 * 
 * Calculates "Available to Spend" = Wallet + Scheduled COD - Projected Outflows
 * Answers seller's critical question: "Can I afford to restock inventory?"
 */

interface AvailableBalanceResponse {
    walletBalance: number;
    scheduledCODSettlements: number;
    projectedOutflows: number;
    availableToSpend: number;
    lowBalanceWarning: boolean;
    threshold: number;
}

export function useAvailableBalance() {
    return useQuery({
        queryKey: ["available-balance"],
        queryFn: async () => {
            const { data } = await axios.get<{ success: boolean; data: AvailableBalanceResponse }>(
                `${API_BASE_URL}/finance/wallet/available-balance`
            );
            return data.data;
        },
        // Cache for 2 minutes (balance changes frequently)
        staleTime: 2 * 60 * 1000,
        // Keep in cache for 5 minutes
        gcTime: 5 * 60 * 1000,
    });
}
