import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { useAuth } from '@/src/features/auth/hooks/useAuth';

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
    lastSettlementAmount?: number;
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

export function useCODTimeline(
    options?: UseQueryOptions<CODTimelineResponse, ApiError>
) {
    const { isInitialized, user } = useAuth();
    const hasCompanyContext = isInitialized && !!user?.companyId;
    const { enabled: optionsEnabled, ...restOptions } = options ?? {};

    return useQuery<CODTimelineResponse, ApiError>({
        queryKey: queryKeys.cod.timeline(),
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: CODTimelineResponse }>(
                '/finance/cod-remittance/timeline'
            );
            return data.data;
        },
        enabled: hasCompanyContext && (optionsEnabled !== false),
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...restOptions,
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
                amount: data.lastSettlementAmount ?? settled.amount
            } : undefined
        }
    };
}
