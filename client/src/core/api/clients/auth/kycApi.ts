/**
 * KYC API Service
 * Handles KYC verification and document submission
 */

import { apiClient } from '@/src/core/api/http';

// Types
// Backend document structure (nested object, not array)
export type DocumentVerificationState =
    | 'not_started'
    | 'pending_provider'
    | 'verified'
    | 'soft_failed'
    | 'hard_failed'
    | 'expired'
    | 'revoked';

export interface VerificationMeta {
    state: DocumentVerificationState;
    provider?: string;
    verifiedAt?: string;
    expiresAt?: string | null;
    attemptId?: string;
    inputHash?: string;
    lastCheckedAt?: string;
    failureReason?: string;
    revokedAt?: string;
}

export interface VerificationHistoryEntry {
    id: string;
    state: DocumentVerificationState;
    provider?: string;
    verifiedAt?: string;
    expiresAt?: string | null;
    attemptId?: string;
    inputHash?: string;
    createdAt: string;
    reason?: string;
}

export interface KYCDocuments {
    pan?: {
        number: string;
        verified: boolean;
        verifiedAt?: Date;
        verificationData?: any;
        name?: string;
        verification?: VerificationMeta;
        verificationHistory?: VerificationHistoryEntry[];
    };
    aadhaar?: {
        number: string;
        verified: boolean;
        verifiedAt?: Date;
        verificationData?: any;
        verification?: VerificationMeta;
        verificationHistory?: VerificationHistoryEntry[];
    };
    gstin?: {
        number: string;
        verified: boolean;
        verifiedAt?: Date;
        verificationData?: any;
        businessName?: string;
        legalName?: string;
        status?: string;
        verification?: VerificationMeta;
        verificationHistory?: VerificationHistoryEntry[];
    };
    bankAccount?: {
        accountNumber: string;
        ifscCode: string;
        accountHolderName: string;
        bankName: string;
        verified: boolean;
        verifiedAt?: Date;
        verificationData?: any;
        verification?: VerificationMeta;
        verificationHistory?: VerificationHistoryEntry[];
    };
}

export interface KYCData {
    _id: string;
    userId: string;
    companyId: string;
    documents: KYCDocuments;
    status: 'pending' | 'verified' | 'rejected' | 'incomplete';
    state?: string;
    completionStatus: {
        personalKycComplete: boolean;
        companyInfoComplete: boolean;
        bankDetailsComplete: boolean;
        agreementComplete: boolean;
    };
    createdAt: string;
    updatedAt: string;
}

export interface VerifyPANRequest {
    pan: string;
    name?: string;
}

export interface VerifyBankAccountRequest {
    accountNumber: string;
    ifsc: string;
    accountHolderName?: string;
}

export interface VerifyGSTINRequest {
    gstin: string;
}

export interface SubmitKYCRequest {
    pan: string;
    bankAccount?: {
        accountNumber: string;
        ifsc?: string;
        ifscCode?: string;
        bankName?: string;
    };
    gstin?: string;
}

export interface KycDocumentSnapshot {
    state: DocumentVerificationState;
    verifiedAt?: string | null;
    expiresAt?: string | null;
    lastCheckedAt?: string | null;
    provider?: string | null;
    canRetry: boolean;
    masked?: string;
}

export interface KycSnapshot {
    pan: KycDocumentSnapshot;
    aadhaar: KycDocumentSnapshot;
    gstin: KycDocumentSnapshot;
    bankAccount: KycDocumentSnapshot;
}

export interface VerifiedKycData {
    pan?: {
        number: string;
        name?: string;
    };
    gstin?: {
        number: string;
        businessName?: string;
        status?: string;
    };
    bankAccount?: {
        accountNumber: string;
        ifscCode: string;
        accountHolderName: string;
        bankName: string;
    };
}

/**
 * KYC API Service
 * Handles all KYC verification and document submission
 * Class-based pattern for consistency and maintainability
 */
class KYCApiService {
    async getKYC(): Promise<{ kyc: KYCData | null; snapshot?: KycSnapshot; verifiedData?: VerifiedKycData }> {
        const response = await apiClient.get('/kyc');
        return response.data?.data ?? response.data;
    }

    async submitKYC(data: SubmitKYCRequest, options?: { signal?: AbortSignal }): Promise<{ message: string; kyc: KYCData }> {
        const response = await apiClient.post('/kyc', data, { signal: options?.signal });
        return response.data;
    }

    async verifyPAN(data: VerifyPANRequest): Promise<{
        success: boolean;
        data: {
            verified: boolean;
            verification?: VerificationMeta;
            data: {
                name?: string;
                nameClean?: string;
                pan: string;
            };
        };
        message?: string;
    }> {
        const response = await apiClient.post('/kyc/verify-pan', data);
        return response.data;
    }

    async verifyBankAccount(data: VerifyBankAccountRequest): Promise<{
        success: boolean;
        data: {
            verified: boolean;
            verification?: VerificationMeta;
            data: {
                accountHolderName?: string;
                accountHolderNameClean?: string;
                bankName?: string;
                bankDetails?: {
                    bankName?: string;
                    branch?: string;
                    address?: string;
                };
            };
        };
        message?: string;
    }> {
        const response = await apiClient.post('/kyc/verify-bank-account', data);
        return response.data;
    }

    async verifyIFSC(ifsc: string): Promise<{
        success: boolean;
        data: {
            bankName?: string;
            bank?: string;
            branch: string;
            address: string;
        };
        message?: string;
    }> {
        const response = await apiClient.post('/kyc/verify-ifsc', { ifsc });
        return response.data;
    }

    async verifyGSTIN(data: VerifyGSTINRequest): Promise<{
        success: boolean;
        data: {
            verified: boolean;
            verification?: VerificationMeta;
            businessInfo: {
                gstin: string;
                businessName: string;
                status: string;
            };
        };
        message?: string;
    }> {
        const response = await apiClient.post('/kyc/verify-gstin', data);
        return response.data;
    }

    async updateAgreement(agreed: boolean, options?: { signal?: AbortSignal }): Promise<{ message: string; kycComplete: boolean }> {
        const response = await apiClient.post('/kyc/agreement', { agreed }, { signal: options?.signal });
        return response.data;
    }

    async invalidateDocument(documentType: 'pan' | 'aadhaar' | 'gstin' | 'bankAccount', reason?: string): Promise<{ message: string; kyc: KYCData }> {
        const response = await apiClient.post('/kyc/invalidate', { documentType, reason });
        return response.data;
    }
}

/**
 * Singleton instance
 */
export const kycApi = new KYCApiService();

export default kycApi;
