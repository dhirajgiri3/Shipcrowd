import { apiClient } from '../http';

export interface WeightDiscrepancy {
    id: string;
    awbNumber: string;
    orderId: string;
    courier: string;
    declaredWeight: number;
    chargedWeight: number;
    difference: number;
    additionalCharge: number;
    status: 'pending' | 'accepted' | 'disputed' | 'resolved';
    createdAt: string;
    deadlineDate: string;
    disputeReason?: string;
    resolution?: string;
    proofFiles?: string[];
}

export interface WeightDiscrepancyFilter {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
}

export const weightApi = {
    /**
     * Get weight discrepancies with filters
     */
    getDiscrepancies: async (params?: WeightDiscrepancyFilter): Promise<{ discrepancies: WeightDiscrepancy[]; total: number; pages: number }> => {
        const response = await apiClient.get('/weight-discrepancies', { params });
        return response.data;
    },

    /**
     * Accept a weight discrepancy
     */
    acceptDiscrepancy: async (id: string): Promise<void> => {
        await apiClient.post(`/weight-discrepancies/${id}/accept`);
    },

    /**
     * Dispute a weight discrepancy
     */
    disputeDiscrepancy: async (id: string, data: { reason: string; proofFiles?: string[] }): Promise<void> => {
        await apiClient.post(`/weight-discrepancies/${id}/dispute`, data);
    }
};
