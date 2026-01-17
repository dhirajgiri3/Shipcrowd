/**
 * Company API Service
 * Handles company creation and management
 */

import { apiClient } from '../config/client';

// Types
export interface CompanyAddress {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
}

export interface CompanyBillingInfo {
    gstin?: string;
    pan?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
}

export interface Company {
    _id: string;
    name: string;
    address: CompanyAddress;
    billingInfo?: CompanyBillingInfo;
    status: 'pending_verification' | 'kyc_submitted' | 'approved' | 'suspended' | 'rejected';
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CompanyStats {
    total: number;
    active: number;
    byStatus: {
        pending_verification: number;
        kyc_submitted: number;
        approved: number;
        suspended: number;
        rejected: number;
    };
}

export interface InviteOwnerData {
    email: string;
    name: string;
    message?: string;
}

export interface CreateCompanyData {
    name: string;
    address: CompanyAddress;
    billingInfo?: CompanyBillingInfo;
}

/**
 * Company API Service
 * Handles all company-related API endpoints
 * Class-based pattern for consistency and maintainability
 */
class CompanyApiService {
    async createCompany(data: CreateCompanyData): Promise<{ message: string; company: Company }> {
        const response = await apiClient.post('/companies', data);
        return response.data;
    }

    async getCompany(companyId: string): Promise<{ company: Company }> {
        const response = await apiClient.get(`/companies/${companyId}`);
        return response.data;
    }

    async updateCompany(companyId: string, data: Partial<CreateCompanyData>): Promise<{ message: string; company: Company }> {
        const response = await apiClient.put(`/companies/${companyId}`, data);
        return response.data;
    }

    async getAllCompanies(params?: { page?: number; limit?: number; search?: string }) {
        const response = await apiClient.get('/companies', { params });
        return response.data;
    }

    async inviteOwner(companyId: string, data: InviteOwnerData): Promise<{ message: string }> {
        const response = await apiClient.post(`/companies/${companyId}/invite-owner`, data);
        return response.data;
    }

    async updateCompanyStatus(
        companyId: string,
        status: Company['status'],
        reason?: string
    ): Promise<{ message: string; company: Company }> {
        const response = await apiClient.patch(
            `/companies/${companyId}/status`,
            { status, reason }
        );
        return response.data;
    }

    async getCompanyStats(): Promise<CompanyStats> {
        const response = await apiClient.get('/companies/stats');
        return response.data;
    }
}

/**
 * Singleton instance
 */
export const companyApi = new CompanyApiService();

export default companyApi;
