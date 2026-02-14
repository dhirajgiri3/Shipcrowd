import { apiClient } from '@/src/core/api/http';

export interface CODDiscrepancy {
    _id: string;
    discrepancyNumber: string;
    shipmentId: {
        _id: string;
        trackingNumber: string;
        paymentDetails: {
            codAmount: number;
            actualCollection?: number;
        };
    };
    awb: string;
    carrier: string;
    amounts: {
        expected: { cod: number; total: number };
        actual: { collected: number; reported: number; source: string };
        difference: number;
    };
    type: string; // amount_mismatch, etc
    severity: 'minor' | 'medium' | 'major' | 'critical';
    status: 'detected' | 'resolved' | 'escalated' | 'accepted' | 'under_review';
    createdAt: string;
    autoResolveAt?: string;
}

export interface ResolveDiscrepancyParams {
    method: 'auto_accept' | 'courier_adjustment' | 'merchant_writeoff' | 'split_difference';
    adjustedAmount?: number;
    remarks?: string;
}

export interface DiscrepancyFilters {
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
    search?: string;
}

class CODDiscrepancyApiService {
    /**
     * Get Discrepancies
     */
    async getDiscrepancies(filters: DiscrepancyFilters = {}) {
        const response = await apiClient.get('/finance/cod/discrepancies', { params: filters });
        return response.data;
    }

    /**
     * Get Single Discrepancy
     */
    async getDiscrepancy(id: string) {
        const response = await apiClient.get(`/finance/cod/discrepancies/${id}`);
        return response.data;
    }

    /**
     * Resolve Discrepancy
     */
    async resolveDiscrepancy(id: string, data: ResolveDiscrepancyParams) {
        const response = await apiClient.post(`/finance/cod/discrepancies/${id}/resolve`, data);
        return response.data;
    }
}

export const codDiscrepancyApi = new CODDiscrepancyApiService();
export default codDiscrepancyApi;
