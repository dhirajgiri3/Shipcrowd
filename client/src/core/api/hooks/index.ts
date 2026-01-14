/**
 * Central export point for all API hooks
 * 
 * Usage:
 * ```ts
 * import { useOrders, useShipments } from '@/src/core/api/hooks';
 * ```
 */

export * from './useOrders';
export * from './useShipments';
export * from './useWallet';
export * from './useCOD';
export * from './useDisputes';
export * from './useNDR';
export * from './useReturns';
export * from './useAnalytics';
export * from './useWarehouses';
export * from './useRateCards';
export * from './useProfile';
export * from './useCompanies';
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
