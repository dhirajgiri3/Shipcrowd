/**
 * Multi-Step Form Hook
 * 
 * Manages wizard-style multi-step form flows with:
 * - Step navigation with validation
 * - Form data persistence across steps
 * - Progress tracking
 * - Completion callback
 */

import { useState, useCallback, useMemo } from 'react';

// ============================================
// TYPES
// ============================================

export interface StepConfig<T> {
    id: string;
    title: string;
    description?: string;
    validate?: (data: T) => boolean | Promise<boolean>;
    fields?: (keyof T)[];
}

export interface UseMultiStepFormOptions<T extends Record<string, any>> {
    steps: StepConfig<T>[];
    initialData: T;
    onStepChange?: (step: number, direction: 'next' | 'prev') => void;
    onComplete: (data: T) => Promise<void> | void;
}

export interface UseMultiStepFormReturn<T extends Record<string, any>> {
    // Navigation
    currentStep: number;
    currentStepConfig: StepConfig<T>;
    totalSteps: number;
    isFirstStep: boolean;
    isLastStep: boolean;
    progress: number; // 0-100

    // Data
    formData: T;

    // Actions
    nextStep: () => Promise<boolean>;
    prevStep: () => void;
    goToStep: (step: number) => void;
    updateFormData: (data: Partial<T>) => void;
    setFieldValue: <K extends keyof T>(field: K, value: T[K]) => void;
    reset: () => void;
    complete: () => Promise<void>;

    // State
    isSubmitting: boolean;
    canProceed: boolean;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useMultiStepForm<T extends Record<string, any>>({
    steps,
    initialData,
    onStepChange,
    onComplete,
}: UseMultiStepFormOptions<T>): UseMultiStepFormReturn<T> {
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState<T>(initialData);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const totalSteps = steps.length;
    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === totalSteps - 1;
    const currentStepConfig = steps[currentStep];
    const progress = Math.round(((currentStep + 1) / totalSteps) * 100);

    // Check if current step has required fields filled
    const canProceed = useMemo(() => {
        const stepFields = currentStepConfig.fields;
        if (!stepFields || stepFields.length === 0) return true;

        return stepFields.every(field => {
            const value = formData[field];
            if (value === null || value === undefined) return false;
            if (typeof value === 'string') return value.trim().length > 0;
            if (Array.isArray(value)) return value.length > 0;
            return true;
        });
    }, [formData, currentStepConfig]);

    // Move to next step (with validation)
    const nextStep = useCallback(async (): Promise<boolean> => {
        // Validate current step if validator exists
        if (currentStepConfig.validate) {
            const isValid = await currentStepConfig.validate(formData);
            if (!isValid) return false;
        }

        if (currentStep < totalSteps - 1) {
            setCurrentStep(prev => prev + 1);
            onStepChange?.(currentStep + 1, 'next');
            return true;
        }
        return false;
    }, [currentStep, totalSteps, currentStepConfig, formData, onStepChange]);

    // Move to previous step
    const prevStep = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
            onStepChange?.(currentStep - 1, 'prev');
        }
    }, [currentStep, onStepChange]);

    // Go to specific step (for step indicators)
    const goToStep = useCallback((step: number) => {
        if (step >= 0 && step < totalSteps && step <= currentStep) {
            // Only allow going back, not forward (must complete steps)
            setCurrentStep(step);
        }
    }, [totalSteps, currentStep]);

    // Update form data (merge)
    const updateFormData = useCallback((data: Partial<T>) => {
        setFormData(prev => ({ ...prev, ...data }));
    }, []);

    // Set single field value
    const setFieldValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    // Reset form to initial state
    const reset = useCallback(() => {
        setCurrentStep(0);
        setFormData(initialData);
        setIsSubmitting(false);
    }, [initialData]);

    // Complete the form (final submission)
    const complete = useCallback(async () => {
        // Validate last step if needed
        if (currentStepConfig.validate) {
            const isValid = await currentStepConfig.validate(formData);
            if (!isValid) return;
        }

        setIsSubmitting(true);
        try {
            await onComplete(formData);
        } finally {
            setIsSubmitting(false);
        }
    }, [formData, currentStepConfig, onComplete]);

    return {
        currentStep,
        currentStepConfig,
        totalSteps,
        isFirstStep,
        isLastStep,
        progress,
        formData,
        nextStep,
        prevStep,
        goToStep,
        updateFormData,
        setFieldValue,
        reset,
        complete,
        isSubmitting,
        canProceed,
    };
}
