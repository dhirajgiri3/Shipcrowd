/**
 * Custom Hooks - Centralized Export
 * 
 * All reusable React hooks in one location
 */

// Data management
export { useDebouncedValue, useDebouncedCallback } from './useDebouncedValue';
export { useBulkSelection } from './useBulkSelection';

// UI/DOM
export { useIntersectionObserver } from './useIntersectionObserver';
export { useMediaQuery } from './useMediaQuery';
export { useToggle } from './useToggle';

// Modal & Forms
export { useModalState } from './useModalState';
export type { UseModalStateOptions, UseModalStateReturn } from './useModalState';

// Analytics Display (Mock)
export { useAnalyticsDisplay } from './useAnalyticsDisplay';

// ... other exports ...

// Analytics (Mock Data)
export {
    useSLAData,
    useCourierComparison,
    useCostAnalysis,
    useCustomReport,
    useAnalyticsDisplay as useAnalyticsParams
} from './useAnalyticsDisplay';

// Utility hooks
export * from './utility/useCountUp';
export * from './utility/useLoader';
export * from './utility/useProgress';
