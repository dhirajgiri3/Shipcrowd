/**
 * KYC API Service
 * Handles KYC verification and document submission
 */

import { apiClient } from '../client';

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

/**
 * KYC API Service
 * Handles all KYC verification and document submission
 * Class-based pattern for consistency and maintainability
 */
class KYCApiService {
    async getKYC(): Promise<{ kyc: KYCData | null }> {
        const response = await apiClient.get('/kyc');
        return response.data;
    }

    async submitKYC(data: SubmitKYCRequest): Promise<{ message: string; kyc: KYCData }> {
        const response = await apiClient.post('/kyc', data);
        return response.data;
    }

    async verifyPAN(data: VerifyPANRequest): Promise<{
        success: boolean;
        verified: boolean;
        data?: { name: string; pan: string };
        message?: string;
    }> {
        const response = await apiClient.post('/kyc/verify-pan', data);
        return response.data;
    }

    async verifyBankAccount(data: VerifyBankAccountRequest): Promise<{
        success: boolean;
        verified: boolean;
        data?: { accountHolderName: string; bankName: string };
        message?: string;
    }> {
        const response = await apiClient.post('/kyc/verify-bank-account', data);
        return response.data;
    }

    async verifyIFSC(ifscCode: string): Promise<{
        success: boolean;
        data?: { bank: string; branch: string; address: string };
        message?: string;
    }> {
        const response = await apiClient.post('/kyc/verify-ifsc', { ifscCode });
        return response.data;
    }

    async verifyGSTIN(data: VerifyGSTINRequest): Promise<{
        success: boolean;
        verified: boolean;
        data?: { businessName: string; gstin: string; status: string };
        message?: string;
    }> {
        const response = await apiClient.post('/kyc/verify-gstin', data);
        return response.data;
    }

    async updateAgreement(accepted: boolean): Promise<{ message: string }> {
        const response = await apiClient.post('/kyc/agreement', { accepted });
        return response.data;
    }
}

/**
 * Singleton instance
 */
export const kycApi = new KYCApiService();

export default kycApi;
