/**
 * Company API Service
 * Handles company creation and management
 */

import { apiClient } from './client';

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

// API Functions
export async function createCompany(data: CreateCompanyData): Promise<{ message: string; company: Company }> {
    const response = await apiClient.post('/companies', data, {
        headers: { 'X-CSRF-Token': 'frontend-request' },
    });
    return response.data;
}

export async function getCompany(companyId: string): Promise<{ company: Company }> {
    const response = await apiClient.get(`/companies/${companyId}`);
    return response.data;
}

export async function updateCompany(companyId: string, data: Partial<CreateCompanyData>): Promise<{ message: string; company: Company }> {
    const response = await apiClient.put(`/companies/${companyId}`, data, {
        headers: { 'X-CSRF-Token': 'frontend-request' },
    });
    return response.data;
}

// Get all companies (admin only)
export async function getAllCompanies(params?: { page?: number; limit?: number; search?: string }) {
    const response = await apiClient.get('/companies', { params });
    return response.data;
}

// Invite company owner (admin only)
export async function inviteOwner(companyId: string, data: InviteOwnerData): Promise<{ message: string }> {
    const response = await apiClient.post(`/companies/${companyId}/invite-owner`, data, {
        headers: { 'X-CSRF-Token': 'frontend-request' },
    });
    return response.data;
}

// Update company status (admin only)
export async function updateCompanyStatus(
    companyId: string,
    status: Company['status'],
    reason?: string
): Promise<{ message: string; company: Company }> {
    const response = await apiClient.patch(
        `/companies/${companyId}/status`,
        { status, reason },
        {
            headers: { 'X-CSRF-Token': 'frontend-request' },
        }
    );
    return response.data;
}

// Get company statistics (admin only)
export async function getCompanyStats(): Promise<CompanyStats> {
    const response = await apiClient.get('/companies/stats');
    return response.data;
}

export const companyApi = {
    createCompany,
    getCompany,
    updateCompany,
    getAllCompanies,
    inviteOwner,
    updateCompanyStatus,
    getCompanyStats,
};

export default companyApi;
