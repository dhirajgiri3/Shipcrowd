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

// Form Validation
export { useFormValidation, validationRules } from './useFormValidation';
export type {
    UseFormValidationOptions,
    UseFormValidationReturn,
    ValidationRule,
    FieldValidationRules
} from './useFormValidation';

// Multi-Step Forms
export { useMultiStepForm } from './useMultiStepForm';
export type {
    UseMultiStepFormOptions,
    UseMultiStepFormReturn,
    StepConfig
} from './useMultiStepForm';

// Analytics
export {
    useAnalyticsParams,
    useSLAData,
    useCourierComparison,
    useCostAnalysis,
    useCustomReport
} from './useAnalytics';

// Utility hooks
export * from './utility/useCountUp';
export * from './utility/useLoader';
export * from './utility/useProgress';
