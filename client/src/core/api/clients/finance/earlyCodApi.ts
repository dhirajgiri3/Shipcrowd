import { apiClient } from '@/src/core/api/http';

export interface EarlyCODEligibility {
    qualified: boolean;
    tier?: 'T+1' | 'T+2' | 'T+3';
    fee?: number;
    reasons?: string[];
    metrics?: {
        monthlyVolume: number;
        rtoRate: number;
        disputeRate: number;
        vintage: number;
    };
}

export interface EarlyCODEnrollment {
    _id: string;
    tier: string;
    fee: number;
    status: 'active' | 'suspended' | 'pending_approval';
    usage: {
        totalAmountRemitted: number;
        totalFeesPaid: number;
    };
}

class EarlyCODApiService {
    /**
     * Check Eligibility
     */
    async checkEligibility() {
        const response = await apiClient.get('/finance/cod/early-program/eligibility');
        return response.data;
    }

    /**
     * Get Active Enrollment
     */
    async getEnrollment() {
        const response = await apiClient.get('/finance/cod/early-program/enrollment');
        return response.data;
    }

    /**
     * Enroll in Program
     */
    async enroll(tier: string) {
        const response = await apiClient.post('/finance/cod/early-program/enroll', { tier });
        return response.data;
    }

    /**
     * Create Early Batch (Manual)
     */
    async createBatch() {
        const response = await apiClient.post('/finance/cod/early-program/create-batch');
        return response.data;
    }
}

export const earlyCodApi = new EarlyCODApiService();
export default earlyCodApi;
