// Security & Compliance Hooks

// Fraud detection (primary - more comprehensive)
export {
    useFraudAlerts,
    useFraudAlert,
    useFraudStats,
    useInvestigateAlert,
    useFraudRules,
    useCreateFraudRule,
    useUpdateFraudRule,
    useDeleteFraudRule,
    useToggleFraudRule,
    useBlockedEntities,
    useBlockEntity,
    useUnblockEntity,
} from './useFraud';

// Security settings (avoid conflict - useSecurity has duplicate fraud exports)
// Export only non-conflicting hooks from useSecurity
// If you need useSecurity's fraud hooks, import directly from './useSecurity'

// KYC
export * from './useKYC';

// Audit Logs
export {
    useAuditLogs,
    useExportAuditLogs,
} from './useAuditLogs';
