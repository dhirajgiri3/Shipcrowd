import { apiClient } from '@/src/lib/api-client';

export interface BankAccount {
    id: string;
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
    isDefault: boolean;
    isVerified: boolean;
}

export interface AddBankAccountPayload {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
}

export const codApi = {
    /**
     * Get all bank accounts for the seller
     */
    getBankAccounts: async (): Promise<BankAccount[]> => {
        const response = await apiClient.get<BankAccount[]>('/seller/bank-accounts');
        return response.data;
    },

    /**
     * Add a new bank account
     */
    addBankAccount: async (data: AddBankAccountPayload): Promise<BankAccount> => {
        const response = await apiClient.post<BankAccount>('/seller/bank-accounts', data);
        return response.data;
    },

    /**
     * Delete a bank account
     */
    deleteBankAccount: async (id: string): Promise<void> => {
        await apiClient.delete(`/seller/bank-accounts/${id}`);
    },

    /**
     * Set a bank account as default
     */
    setDefaultBankAccount: async (id: string): Promise<void> => {
        await apiClient.put(`/seller/bank-accounts/${id}/default`, {});
    }
};
