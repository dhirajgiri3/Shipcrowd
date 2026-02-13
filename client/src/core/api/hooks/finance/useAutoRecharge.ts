import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { walletApi, AutoRechargeSettings } from '../../clients/finance/walletApi';

/**
 * Hook to fetch current auto-recharge settings
 */
export function useAutoRechargeSettings() {
    return useQuery({
        queryKey: ['auto-recharge-settings'],
        queryFn: () => walletApi.getAutoRechargeSettings(),
        staleTime: 60000, // 1 minute
    });
}

/**
 * Hook to update auto-recharge settings
 * Invalidates both settings and wallet balance queries on success
 */
export function useUpdateAutoRecharge() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (settings: Partial<AutoRechargeSettings>) =>
            walletApi.updateAutoRechargeSettings(settings),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['auto-recharge-settings'] });
            // Keep in sync with centralized key factory: queryKeys.wallet.balance()
            queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] });
        },
    });
}
