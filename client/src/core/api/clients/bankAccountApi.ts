/**
 * Bank Account API Service
 * Handles seller bank account management
 */

import { apiClient } from '../http';

// Types
export interface BankAccount {
    _id: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountHolderName?: string;
    isDefault: boolean;
    isVerified: boolean;
}

export interface BankAccountRequest {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    isDefault?: boolean;
}

class BankAccountApiService {
    /**
     * Get all bank accounts
     */
    async getBankAccounts(): Promise<{ accounts: BankAccount[] }> {
        const response = await apiClient.get('/seller/bank-accounts');
        return response.data;
    }

    /**
     * Add a new bank account
     */
    async addBankAccount(data: BankAccountRequest): Promise<{ account: BankAccount }> {
        const response = await apiClient.post('/seller/bank-accounts', data);
        return response.data;
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
    async setDefaultBankAccount(id: string): Promise<void> {
        await apiClient.put(`/seller/bank-accounts/${id}/default`, {});
    }
}

export const bankAccountApi = new BankAccountApiService();
export default bankAccountApi;
