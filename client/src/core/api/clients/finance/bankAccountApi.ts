/**
 * Bank Account API Service
 * Handles seller bank account management
 */

import { apiClient } from '@/src/core/api/http';

// Types
export interface BankAccount {
    id: string;
    bankName: string;
    accountHolderName?: string;
    maskedAccountNumber: string;
    accountLast4: string;
    ifscCode: string;
    verificationStatus: 'pending' | 'verified' | 'failed';
    verifiedAt?: string;
    isDefault: boolean;
}

export interface BankAccountRequest {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    isDefault?: boolean;
}

class BankAccountApiService {
    private unwrap<T>(response: any): T {
        return (response?.data?.data ?? response?.data) as T;
    }

    /**
     * Get all bank accounts
     */
    async getBankAccounts(): Promise<{ accounts: BankAccount[] }> {
        const response = await apiClient.get('/seller/bank-accounts');
        return this.unwrap<{ accounts: BankAccount[] }>(response);
    }

    /**
     * Add a new bank account
     */
    async addBankAccount(data: BankAccountRequest): Promise<{ account: BankAccount }> {
        const response = await apiClient.post('/seller/bank-accounts', data);
        return this.unwrap<{ account: BankAccount }>(response);
    }

    /**
     * Delete a bank account
     */
    async deleteBankAccount(id: string): Promise<void> {
        await apiClient.delete(`/seller/bank-accounts/${id}`);
    }
    /**
     * Set a bank account as default
     */
    async setDefaultBankAccount(id: string): Promise<{ account: { id: string; isDefault: boolean } }> {
        const response = await apiClient.put(`/seller/bank-accounts/${id}/default`, {});
        return this.unwrap<{ account: { id: string; isDefault: boolean } }>(response);
    }
}

export const bankAccountApi = new BankAccountApiService();
export default bankAccountApi;
