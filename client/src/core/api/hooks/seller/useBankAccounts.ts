/**
 * Bank Account Hooks
 * Hooks for managing seller bank accounts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bankAccountApi, BankAccountRequest } from '../../clients/bankAccountApi';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import { ApiError } from '../../http';

/**
 * Hook to fetch bank accounts
 */
export const useBankAccounts = () => {
    return useQuery({
        queryKey: ['seller', 'bank-accounts'],
        queryFn: () => bankAccountApi.getBankAccounts(),
        ...CACHE_TIMES.LONG, // Bank accounts rarely change
        retry: RETRY_CONFIG.DEFAULT,
    });
};

/**
 * Hook to add a bank account
 */
export const useAddBankAccount = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: BankAccountRequest) => bankAccountApi.addBankAccount(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['seller', 'bank-accounts'] });
            showSuccessToast('Bank account added successfully');
        },
        onError: (error: ApiError) => {
            handleApiError(error, 'Failed to add bank account');
        },
    });
};

/**
 * Hook to delete a bank account
 */
export const useDeleteBankAccount = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => bankAccountApi.deleteBankAccount(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['seller', 'bank-accounts'] });
            showSuccessToast('Bank account removed successfully');
        },
        onError: (error: ApiError) => {
            handleApiError(error, 'Failed to remove bank account');
        },
    });
};

/**
 * Hook to set default bank account
 */
export const useSetDefaultBankAccount = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => bankAccountApi.setDefaultBankAccount(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['seller', 'bank-accounts'] });
            showSuccessToast('Default bank account updated');
        },
        onError: (error: ApiError) => {
            handleApiError(error, 'Failed to update default account');
        },
    });
};
