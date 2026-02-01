// External Integrations Hooks

// E-commerce integrations (primary)
export {
    useIntegrations,
    useIntegration,
    useSyncLogs,
    useCreateIntegration,
    useUpdateIntegration,
    useDeleteIntegration,
    useTestConnection,
    useTriggerSync,
    useReconnectIntegration,
    useInitiateOAuth,
    useCompleteOAuth,
    useToggleIntegrationSync,
} from './useEcommerceIntegrations';

// Legacy integrations hook (mock data) - avoid conflict by not re-exporting useIntegrations
// If needed, import directly from './useIntegrations'

// Webhooks
export {
    useWebhooks,
    useCreateWebhook,
    useTestWebhook,
    useDeleteWebhook,
} from './useWebhooks';
