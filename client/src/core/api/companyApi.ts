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
    isActive: boolean;
    createdAt: string;
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

export const companyApi = {
    createCompany,
    getCompany,
    updateCompany,
};

export default companyApi;
