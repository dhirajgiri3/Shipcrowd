/**
 * API Hooks - Barrel Export
 * 
 * Central export point for all API-related React Query hooks.
 * Import from here for cleaner, more maintainable code.
 * 
 * @example
 * ```tsx
 * import { useOrders, useCreateOrder } from '@/src/hooks/api';
 * ```
 */

export * from './useAuth';
export * from './useUser';
export * from './useCompany';
export * from './useOrders';
export * from './useShipments';
export * from './useAddress';
export * from './useNDR';
export * from './useWallet';
export * from './useCOD';
export * from './useDisputes';
export * from './useAnalytics'; // Retained from original, not in snippet but implied by context
export * from './useWarehouses'; // Retained from original, not in snippet but implied by context
export * from './useRateCards'; // Retained from original, not in snippet but implied by context
export * from './useProfile'; // Retained from original, not in snippet but implied by context
export * from './useCompanies'; // Retained from original, not in snippet but implied by context
export * from './useKYC'; // Retained from original, not in snippet but implied by context
export * from './useIntegrations';
export * from './useSettlements';
export * from './useSellerActions';
export * from './useRecentCustomers';
// The following named exports for useWallet and useCOD are now redundant
// because 'export * from './useWallet';' and 'export * from './useCOD';'
// are now present above, as per the provided Code Edit.
// However, to faithfully apply the *exact* snippet provided, I will keep the
// named exports as they are still present in the snippet's context,
// even if they create redundancy.

export {
    useWalletBalance,
    useWalletTransactions,
    useWalletStats,
    useRechargeWallet,
    useWithdrawWallet,
} from './useWallet';

// COD Remittance hooks
export {
    useCODRemittances,
    useCODRemittance,
    useCODStats,
    useEligibleShipments,
    useCreateRemittanceBatch,
    useApproveRemittance,
    useInitiatePayout,
    useCancelRemittance,
    useRequestPayout,
} from './useCOD';
