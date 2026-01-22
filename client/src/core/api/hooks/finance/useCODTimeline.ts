import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5005/api/v1";

/**
 * COD Settlement Timeline Hook
 * 
 * Fetches 4-stage pipeline data:
 * - Collected: Delivered COD not yet batched
 * - In Process: Pending approval batches  
 * - Scheduled: Approved, ready for payout
 * - Settled: Paid in last 30 days
 */

export interface CODTimelineStage {
    stage: 'collected' | 'in_process' | 'scheduled' | 'settled';
    amount: number;
    count: number;
    date: string | null;
}

export interface CODTimelineResponse {
    stages: CODTimelineStage[];
    nextSettlementIn: string;
    totalPending: number;
}

// CODSettlementTimeline component interface (what component expects)
export interface CODSettlementData {
    collected: {
        amount: number;
        count: number;
    };
    inProcess: {
        amount: number;
        count: number;
        expectedDate?: string;
    };
    scheduled: {
        amount: number;
        date: string;
        courier?: string;
        method?: string;
    }[];
    settled: {
        thisMonth: number;
        count: number;
        lastSettlement?: {
            date: string;
            amount: number;
        };
    };
}

export function useCODTimeline() {
    return useQuery({
        queryKey: ["cod-timeline"],
        queryFn: async () => {
            const { data } = await axios.get<{ success: boolean; data: CODTimelineResponse }>(
                `${API_BASE_URL}/finance/cod-remittance/timeline`,
                { withCredentials: true }
            );
            return data.data;
        },
        // Cache for 5 minutes (settlements don't change frequently)
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
}

// Transform API response to CODSettlementTimeline component format
export function transformCODTimelineToComponent(data: CODTimelineResponse): CODSettlementData {
    const stageMap = data.stages.reduce((acc, stage) => {
        acc[stage.stage] = stage;
        return acc;
    }, {} as Record<string, CODTimelineStage>);

    const collected = stageMap['collected'] || { amount: 0, count: 0, date: null };
    const inProcess = stageMap['in_process'] || { amount: 0, count: 0, date: null };
    const scheduled = stageMap['scheduled'] || { amount: 0, count: 0, date: null };
    const settled = stageMap['settled'] || { amount: 0, count: 0, date: null };

    return {
        collected: {
            amount: collected.amount,
            count: collected.count
        },
        inProcess: {
            amount: inProcess.amount,
            count: inProcess.count,
            expectedDate: inProcess.date || undefined
        },
        scheduled: scheduled.amount > 0 ? [{
            amount: scheduled.amount,
            date: scheduled.date || new Date().toISOString(),
            method: 'IMPS'
        }] : [],
        settled: {
            thisMonth: settled.amount,
            count: settled.count,
            lastSettlement: settled.date ? {
                date: settled.date || new Date().toISOString(),
                amount: settled.amount
            } : undefined
        }
    };
}
