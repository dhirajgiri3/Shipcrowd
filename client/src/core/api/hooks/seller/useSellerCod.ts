import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { codApi, AddBankAccountPayload } from '../../clients/codApi';
import { queryKeys } from '../../config/query-keys';

export const useSellerCod = () => {
    const queryClient = useQueryClient();

    // Query for fetching bank accounts
    const useBankAccounts = () => {
        return useQuery({
            queryKey: queryKeys.settings.bankAccounts(),
            queryFn: () => codApi.getBankAccounts(),
        });
    };

    // Mutation for adding a bank account
    const useAddBankAccount = () => {
        return useMutation({
            mutationFn: (data: AddBankAccountPayload) => codApi.addBankAccount(data),
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: queryKeys.settings.bankAccounts() });
            },
        });
    };

    // Mutation for deleting a bank account
    const useDeleteBankAccount = () => {
        return useMutation({
            mutationFn: (id: string) => codApi.deleteBankAccount(id),
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: queryKeys.settings.bankAccounts() });
            },
        });
    };

    // Mutation for setting default bank account
    const useSetDefaultBankAccount = () => {
        return useMutation({
            mutationFn: (id: string) => codApi.setDefaultBankAccount(id),
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: queryKeys.settings.bankAccounts() });
            },
        });
    };

    return {
        useBankAccounts,
        useAddBankAccount,
        useDeleteBankAccount,
        useSetDefaultBankAccount
    };
};
