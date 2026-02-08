/**
 * Rate Card Management API Service
 * Handles rate card assignments and courier management
 */

import { apiClient } from '@/src/core/api/http';

// Types
export interface RateCardAssignment {
    id: string;
    rateCardId: string;
    rateCardName: string;
    sellerId: string;
    sellerName: string;
    priority: number;
    assignedAt: string;
    assignedBy: string;
    isActive: boolean;
}

export interface CourierInfo {
    id: string;
    name: string;
    code: string;
    serviceTypes: string[];
    isActive: boolean;
    avgDeliveryTime: number;
    rating: number;
}

export interface AssignRateCardData {
    rateCardId: string;
    sellerId: string;
    priority: number;
}

export interface AssignmentsResponse {
    assignments: RateCardAssignment[];
    total: number;
}

export interface CouriersResponse {
    couriers: CourierInfo[];
}

class RateCardManagementApiService {
    /**
     * Get all rate card assignments
     */
    async getAssignments(): Promise<AssignmentsResponse> {
        const response = await apiClient.get('/admin/ratecards/assignments');
        return response.data.data;
    }

    /**
     * Assign rate card to seller
     */
    async assign(data: AssignRateCardData): Promise<RateCardAssignment> {
        const response = await apiClient.post('/admin/ratecards/assign', data);
        return response.data.data;
    }

    /**
     * Unassign rate card
     */
    async unassign(assignmentId: string): Promise<void> {
        await apiClient.delete(`/admin/ratecards/unassign/${assignmentId}`);
    }

    /**
     * Get available couriers
     */
    async getAvailableCouriers(): Promise<CouriersResponse> {
        const response = await apiClient.get('/admin/ratecards/couriers');
        return response.data.data;
    }

    /**
     * Bulk assign rate cards
     */
    async bulkAssign(assignments: AssignRateCardData[]): Promise<void> {
        await apiClient.post('/admin/ratecards/bulk-assign', { assignments });
    }
}

export const rateCardManagementApi = new RateCardManagementApiService();
export default rateCardManagementApi;
