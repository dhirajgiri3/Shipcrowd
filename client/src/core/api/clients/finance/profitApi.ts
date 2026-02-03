/**
 * Profit API Service
 * Handles admin profit tracking, data import/export
 */

import { apiClient } from '@/src/core/api/http';

// Types
export interface ProfitData {
    id: string;
    date: string;
    sellerId: string;
    sellerName: string;
    shipments: number;
    shippingCost: number;
    charged: number;
    profit: number;
    margin: number;
}

export interface ProfitStats {
    totalProfit: number;
    totalCharged: number;
    totalShipments: number;
    avgMargin: number;
}

export interface ProfitFilters {
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    sellerId?: string;
    page?: number;
    limit?: number;
}

export interface ImportHistoryItem {
    id: string;
    date: string;
    filename: string;
    records: number;
    status: 'success' | 'partial' | 'failed';
    errors?: number;
}

export interface ProfitResponse {
    data: ProfitData[];
    stats: ProfitStats;
    total: number;
    pages: number;
}

class ProfitApiService {
    /**
     * Get profit data with filters
     */
    async getProfitData(filters?: ProfitFilters): Promise<ProfitResponse> {
        const response = await apiClient.get('/admin/profit', { params: filters });
        return response.data;
    }

    /**
     * Import profit data from file (CSV/Excel)
     */
    async importData(file: File): Promise<{ message: string; importId: string }> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await apiClient.post('/admin/profit/import', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }

    /**
     * Get import history
     */
    async getImportHistory(): Promise<ImportHistoryItem[]> {
        const response = await apiClient.get('/admin/profit/import-history');
        return response.data;
    }

    /**
     * Export profit data
     */
    async exportData(filters?: ProfitFilters & { format: 'csv' | 'xlsx' }): Promise<Blob> {
        const response = await apiClient.get('/admin/profit/export', {
            params: filters,
            responseType: 'blob',
        });
        return response.data;
    }
}

export const profitApi = new ProfitApiService();
export default profitApi;
