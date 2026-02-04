/**
 * Integration State Management Hook
 * 
 * Centralized state management for integration forms with:
 * - Auto-save to localStorage with debouncing
 * - Centralized validation logic
 * - Draft management
 * - State machine for form progress
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { debounce } from '@/src/lib/utils/common';

export type IntegrationType = 'SHOPIFY' | 'WOOCOMMERCE' | 'AMAZON' | 'FLIPKART';

export type FormState = 'idle' | 'validating' | 'testing' | 'ready' | 'submitting' | 'error';

export interface ValidationError {
    field: string;
    message: string;
}

export interface IntegrationFormData {
    [key: string]: any;
}

export interface UseIntegrationStateOptions {
    integrationType: IntegrationType;
    initialState: IntegrationFormData;
    validationRules?: ValidationRules;
    autoSave?: boolean;
    autoSaveDelay?: number;
}

export interface ValidationRules {
    [field: string]: (value: any) => string | null;
}

export interface UseIntegrationStateReturn {
    formData: IntegrationFormData;
    formState: FormState;
    validationErrors: ValidationError[];
    isDraft: boolean;
    updateField: (field: string, value: any) => void;
    validateField: (field: string) => boolean;
    validateAll: () => boolean;
    setFormState: (state: FormState) => void;
    saveDraft: () => void;
    loadDraft: () => IntegrationFormData | null;
    clearDraft: () => void;
    resetForm: () => void;
}

const STORAGE_KEY_PREFIX = 'integration-draft-';

/**
 * Get localStorage key for integration type
 */
const getStorageKey = (type: IntegrationType): string => {
    return `${STORAGE_KEY_PREFIX}${type.toLowerCase()}`;
};

/**
 * Default validation rules for common fields
 */
const defaultValidationRules: ValidationRules = {
    // Shopify validations
    shopDomain: (value: string) => {
        if (!value) return 'Store domain is required';
        const trimmed = value.trim().toLowerCase();
        // Accept full domain or just store name
        if (trimmed.includes('.myshopify.com')) {
            // Validate full domain format
            if (!/^[a-zA-Z0-9-]+\.myshopify\.com$/.test(trimmed)) {
                return 'Enter a valid Shopify domain (e.g., yourstore.myshopify.com)';
            }
        } else {
            // Validate store name only
            if (!/^[a-zA-Z0-9-]+$/.test(trimmed)) {
                return 'Store name can only contain letters, numbers, and hyphens';
            }
        }
        return null;
    },

    // WooCommerce validations
    storeUrl: (value: string) => {
        if (!value) return 'Store URL is required';
        const trimmed = value.trim();
        try {
            const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
            if (!url.hostname) return 'Enter a valid URL';
            return null;
        } catch {
            return 'Enter a valid URL (e.g., yourstore.com or https://yourstore.com)';
        }
    },
    consumerKey: (value: string) => {
        if (!value) return 'Consumer Key is required';
        const trimmed = value.trim();
        if (!trimmed.startsWith('ck_')) return 'Consumer Key must start with "ck_"';
        if (trimmed.length < 20) return 'Consumer Key appears too short (should be 40+ characters)';
        return null;
    },
    consumerSecret: (value: string) => {
        if (!value) return 'Consumer Secret is required';
        const trimmed = value.trim();
        if (!trimmed.startsWith('cs_')) return 'Consumer Secret must start with "cs_"';
        if (trimmed.length < 20) return 'Consumer Secret appears too short (should be 40+ characters)';
        return null;
    },

    // Amazon validations
    sellerId: (value: string) => {
        if (!value) return 'Seller ID is required';
        const trimmed = value.trim().toUpperCase();
        // Amazon Seller IDs are typically 13-14 alphanumeric characters, often starting with 'A'
        if (!/^[A-Z0-9]{10,20}$/.test(trimmed)) {
            return 'Seller ID should be 10-20 alphanumeric characters';
        }
        return null;
    },
    mwsAuthToken: (value: string) => {
        if (!value) return 'MWS Auth Token is required';
        const trimmed = value.trim();
        if (!trimmed.startsWith('amzn.mws.')) {
            return 'MWS Auth Token must start with "amzn.mws."';
        }
        if (trimmed.length < 30) return 'MWS Auth Token appears too short';
        return null;
    },

    // Flipkart validations
    appId: (value: string) => {
        if (!value) return 'App ID is required';
        if (value.trim().length < 6) return 'App ID appears too short';
        return null;
    },
    appSecret: (value: string) => {
        if (!value) return 'App Secret is required';
        if (value.trim().length < 10) return 'App Secret appears too short';
        return null;
    },
    accessToken: (value: string) => {
        if (!value) return 'Access Token is required';
        if (value.trim().length < 20) return 'Access Token appears too short';
        return null;
    },
};

/**
 * Hook for managing integration form state
 */
export function useIntegrationState({
    integrationType,
    initialState,
    validationRules = {},
    autoSave = true,
    autoSaveDelay = 500,
}: UseIntegrationStateOptions): UseIntegrationStateReturn {
    const [formData, setFormData] = useState<IntegrationFormData>(initialState);
    const [formState, setFormState] = useState<FormState>('idle');
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
    const [isDraft, setIsDraft] = useState(false);

    // Merge default and custom validation rules
    const allValidationRules = { ...defaultValidationRules, ...validationRules };

    // Ref to track if we've loaded from draft
    const hasLoadedDraft = useRef(false);

    /**
     * Load draft from localStorage on mount
     */
    useEffect(() => {
        if (!hasLoadedDraft.current) {
            const draft = loadDraft();
            if (draft) {
                setFormData(draft);
                setIsDraft(true);
            }
            hasLoadedDraft.current = true;
        }
    }, []);

    /**
     * Save draft to localStorage
     */
    const saveDraft = useCallback(() => {
        try {
            const key = getStorageKey(integrationType);
            localStorage.setItem(key, JSON.stringify(formData));
            setIsDraft(true);
        } catch (error) {
            console.error('Failed to save draft:', error);
        }
    }, [integrationType, formData]);

    /**
     * Load draft from localStorage
     */
    const loadDraft = useCallback((): IntegrationFormData | null => {
        try {
            const key = getStorageKey(integrationType);
            const stored = localStorage.getItem(key);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load draft:', error);
        }
        return null;
    }, [integrationType]);

    /**
     * Clear draft from localStorage
     */
    const clearDraft = useCallback(() => {
        try {
            const key = getStorageKey(integrationType);
            localStorage.removeItem(key);
            setIsDraft(false);
        } catch (error) {
            console.error('Failed to clear draft:', error);
        }
    }, [integrationType]);

    /**
     * Save current form data to draft
     * This is wrapped in useCallback to ensure debounce gets latest closure
     */
    const saveCurrentDraft = useCallback(() => {
        try {
            const key = getStorageKey(integrationType);
            localStorage.setItem(key, JSON.stringify(formData));
            setIsDraft(true);
        } catch (error) {
            console.error('Failed to save draft:', error);
        }
    }, [integrationType, formData]);

    /**
     * Debounced auto-save function
     * Recreated when saveCurrentDraft changes to avoid stale closures
     */
    const debouncedSave = useRef<((...args: any[]) => void) | undefined>(undefined);

    useEffect(() => {
        debouncedSave.current = debounce(saveCurrentDraft, autoSaveDelay);
    }, [saveCurrentDraft, autoSaveDelay]);

    /**
     * Auto-save when formData changes
     */
    useEffect(() => {
        if (autoSave && hasLoadedDraft.current && debouncedSave.current) {
            debouncedSave.current();
        }
    }, [formData, autoSave]);

    /**
     * Update a single field
     */
    const updateField = useCallback((field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
        }));

        // Clear validation error for this field
        setValidationErrors(prev => prev.filter(err => err.field !== field));
    }, []);

    /**
     * Validate a single field
     */
    const validateField = useCallback((field: string): boolean => {
        const rule = allValidationRules[field];
        if (!rule) return true;

        const error = rule(formData[field]);
        if (error) {
            setValidationErrors(prev => [
                ...prev.filter(err => err.field !== field),
                { field, message: error },
            ]);
            return false;
        }

        setValidationErrors(prev => prev.filter(err => err.field !== field));
        return true;
    }, [formData, allValidationRules]);

    /**
     * Validate all fields
     */
    const validateAll = useCallback((): boolean => {
        const errors: ValidationError[] = [];

        Object.keys(allValidationRules).forEach(field => {
            const rule = allValidationRules[field];
            const error = rule(formData[field]);
            if (error) {
                errors.push({ field, message: error });
            }
        });

        setValidationErrors(errors);
        return errors.length === 0;
    }, [formData, allValidationRules]);

    /**
     * Reset form to initial state
     */
    const resetForm = useCallback(() => {
        setFormData(initialState);
        setValidationErrors([]);
        setFormState('idle');
        clearDraft();
    }, [initialState, clearDraft]);

    return {
        formData,
        formState,
        validationErrors,
        isDraft,
        updateField,
        validateField,
        validateAll,
        setFormState,
        saveDraft,
        loadDraft,
        clearDraft,
        resetForm,
    };
}
