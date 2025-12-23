/**
 * KYC API Service
 * Handles KYC verification and document submission
 */

import { apiClient } from './client';

// Types
export interface KYCDocument {
    type: 'pan' | 'aadhaar' | 'gstin' | 'bank_account';
    number: string;
    status: 'pending' | 'verified' | 'rejected';
    verifiedAt?: string;
    rejectionReason?: string;
}

export interface KYCData {
    _id: string;
    userId: string;
    companyId: string;
    documents: KYCDocument[];
    status: 'pending' | 'verified' | 'rejected' | 'incomplete';
    agreementAccepted: boolean;
    agreementAcceptedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface VerifyPANRequest {
    panNumber: string;
}

export interface VerifyBankAccountRequest {
    accountNumber: string;
    ifscCode: string;
}

export interface VerifyGSTINRequest {
    gstin: string;
}

export interface SubmitKYCRequest {
    panNumber: string;
    bankDetails?: {
        accountNumber: string;
        ifscCode: string;
        bankName?: string;
    };
    gstin?: string;
}

// API Functions
export async function getKYC(): Promise<{ kyc: KYCData | null }> {
    const response = await apiClient.get('/kyc');
    return response.data;
}

export async function submitKYC(data: SubmitKYCRequest): Promise<{ message: string; kyc: KYCData }> {
    const response = await apiClient.post('/kyc', data, {
        headers: { 'X-CSRF-Token': 'frontend-request' },
    });
    return response.data;
}

export async function verifyPAN(data: VerifyPANRequest): Promise<{
    success: boolean;
    verified: boolean;
    data?: { name: string; pan: string };
    message?: string;
}> {
    const response = await apiClient.post('/kyc/verify-pan', data, {
        headers: { 'X-CSRF-Token': 'frontend-request' },
    });
    return response.data;
}

export async function verifyBankAccount(data: VerifyBankAccountRequest): Promise<{
    success: boolean;
    verified: boolean;
    data?: { accountHolderName: string; bankName: string };
    message?: string;
}> {
    const response = await apiClient.post('/kyc/verify-bank-account', data, {
        headers: { 'X-CSRF-Token': 'frontend-request' },
    });
    return response.data;
}

export async function verifyIFSC(ifscCode: string): Promise<{
    success: boolean;
    data?: { bank: string; branch: string; address: string };
    message?: string;
}> {
    const response = await apiClient.post('/kyc/verify-ifsc', { ifscCode }, {
        headers: { 'X-CSRF-Token': 'frontend-request' },
    });
    return response.data;
}

export async function verifyGSTIN(data: VerifyGSTINRequest): Promise<{
    success: boolean;
    verified: boolean;
    data?: { businessName: string; gstin: string; status: string };
    message?: string;
}> {
    const response = await apiClient.post('/kyc/verify-gstin', data, {
        headers: { 'X-CSRF-Token': 'frontend-request' },
    });
    return response.data;
}

export async function updateAgreement(accepted: boolean): Promise<{ message: string }> {
    const response = await apiClient.post('/kyc/agreement', { accepted }, {
        headers: { 'X-CSRF-Token': 'frontend-request' },
    });
    return response.data;
}

export const kycApi = {
    getKYC,
    submitKYC,
    verifyPAN,
    verifyBankAccount,
    verifyIFSC,
    verifyGSTIN,
    updateAgreement,
};

export default kycApi;
