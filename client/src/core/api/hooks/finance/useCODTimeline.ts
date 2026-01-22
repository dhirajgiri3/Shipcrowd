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

// Transform API response to match CODSettlementTimeline component props
export function transformCODTimelineToComponent(data: CODTimelineResponse) {
    const stageLabels = {
        collected: 'Collected',
        in_process: 'In Process',
        scheduled: 'Scheduled',
        settled: 'Settled'
    };

    return {
        stages: data.stages.map(stage => ({
            label: stageLabels[stage.stage],
            amount: stage.amount,
            count: stage.count,
            estimatedDate: stage.date
        })),
        nextSettlementIn: data.nextSettlementIn,
        totalPending: data.totalPending
    };
}
