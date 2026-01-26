import { useExportReport } from './useAnalytics';

/**
 * Compatibility alias for plan docs/components expecting `useAnalyticsExport`.
 * The real implementation already exists as `useExportReport` in `useAnalytics.ts`.
 */
export const useAnalyticsExport = useExportReport;

