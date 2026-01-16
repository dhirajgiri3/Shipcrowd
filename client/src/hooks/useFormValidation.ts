/**
 * Form Validation Hook
 * 
 * Centralized form validation with field-level validation, submission handling,
 * and integration with existing Indian validators.
 * 
 * Features:
 * - Field-level validation with touch tracking
 * - Async validation support
 * - Form submission with loading state
 * - Integration with useToast for error notifications
 * - Reusable validation rules
 */

import { useState, useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui';
import {
    isValidPAN,
    isValidGSTIN,
    isValidAadhaar,
    isValidPincode,
    isValidPhone,
    isValidIFSC,
    isValidBankAccount,
} from '@/src/shared/utils/validators';

// ============================================
// TYPES
// ============================================

export type ValidationRule<T, K extends keyof T> = {
    validate: (value: T[K], formData: T) => boolean | Promise<boolean>;
    message: string;
};

export type FieldValidationRules<T> = {
    [K in keyof T]?: ValidationRule<T, K>[];
};

export interface UseFormValidationOptions<T extends Record<string, any>> {
    initialValues: T;
    validationRules?: FieldValidationRules<T>;
    validateOnChange?: boolean;
    validateOnBlur?: boolean;
    onSubmit: (values: T) => Promise<void> | void;
    onError?: (errors: Partial<Record<keyof T, string>>) => void;
}

export interface UseFormValidationReturn<T extends Record<string, any>> {
    // Values
    values: T;
    errors: Partial<Record<keyof T, string>>;
    touched: Partial<Record<keyof T, boolean>>;

    // State
    isSubmitting: boolean;
    isValid: boolean;
    isDirty: boolean;

    // Actions
    setValue: <K extends keyof T>(field: K, value: T[K]) => void;
    setValues: (values: Partial<T>) => void;
    setError: <K extends keyof T>(field: K, error: string) => void;
    clearError: <K extends keyof T>(field: K) => void;
    handleBlur: <K extends keyof T>(field: K) => void;
    handleChange: <K extends keyof T>(field: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    validateField: <K extends keyof T>(field: K) => Promise<boolean>;
    validateForm: () => Promise<boolean>;
    handleSubmit: (e?: React.FormEvent) => Promise<void>;
    reset: (newValues?: Partial<T>) => void;

    // Helpers
    getFieldProps: <K extends keyof T>(field: K) => {
        value: T[K];
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
        onBlur: () => void;
        error: string | undefined;
        touched: boolean;
    };
}

// ============================================
// BUILT-IN VALIDATION RULES
// ============================================

export const validationRules = {
    required: <T, K extends keyof T>(message = 'This field is required'): ValidationRule<T, K> => ({
        validate: (value) => {
            if (value === null || value === undefined) return false;
            if (typeof value === 'string') return value.trim().length > 0;
            if (Array.isArray(value)) return value.length > 0;
            return true;
        },
        message,
    }),

    email: <T, K extends keyof T>(message = 'Invalid email address'): ValidationRule<T, K> => ({
        validate: (value) => {
            if (!value) return true; // Optional - use required for mandatory
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(String(value));
        },
        message,
    }),

    minLength: <T, K extends keyof T>(min: number, message?: string): ValidationRule<T, K> => ({
        validate: (value) => {
            if (!value) return true;
            return String(value).length >= min;
        },
        message: message || `Must be at least ${min} characters`,
    }),

    maxLength: <T, K extends keyof T>(max: number, message?: string): ValidationRule<T, K> => ({
        validate: (value) => {
            if (!value) return true;
            return String(value).length <= max;
        },
        message: message || `Must be at most ${max} characters`,
    }),

    min: <T, K extends keyof T>(min: number, message?: string): ValidationRule<T, K> => ({
        validate: (value) => {
            if (value === null || value === undefined || value === '') return true;
            return Number(value) >= min;
        },
        message: message || `Must be at least ${min}`,
    }),

    max: <T, K extends keyof T>(max: number, message?: string): ValidationRule<T, K> => ({
        validate: (value) => {
            if (value === null || value === undefined || value === '') return true;
            return Number(value) <= max;
        },
        message: message || `Must be at most ${max}`,
    }),

    pattern: <T, K extends keyof T>(regex: RegExp, message = 'Invalid format'): ValidationRule<T, K> => ({
        validate: (value) => {
            if (!value) return true;
            return regex.test(String(value));
        },
        message,
    }),

    // Indian-specific validations using existing validators
    pan: <T, K extends keyof T>(message = 'Invalid PAN number'): ValidationRule<T, K> => ({
        validate: (value) => isValidPAN(String(value || '')),
        message,
    }),

    gstin: <T, K extends keyof T>(message = 'Invalid GSTIN'): ValidationRule<T, K> => ({
        validate: (value) => isValidGSTIN(String(value || '')),
        message,
    }),

    aadhaar: <T, K extends keyof T>(message = 'Invalid Aadhaar number'): ValidationRule<T, K> => ({
        validate: (value) => isValidAadhaar(String(value || '')),
        message,
    }),

    pincode: <T, K extends keyof T>(message = 'Invalid pincode'): ValidationRule<T, K> => ({
        validate: (value) => isValidPincode(String(value || '')),
        message,
    }),

    phone: <T, K extends keyof T>(message = 'Invalid phone number'): ValidationRule<T, K> => ({
        validate: (value) => isValidPhone(String(value || '')),
        message,
    }),

    ifsc: <T, K extends keyof T>(message = 'Invalid IFSC code'): ValidationRule<T, K> => ({
        validate: (value) => isValidIFSC(String(value || '')),
        message,
    }),

    bankAccount: <T, K extends keyof T>(message = 'Invalid bank account number'): ValidationRule<T, K> => ({
        validate: (value) => isValidBankAccount(String(value || '')),
        message,
    }),

    // Custom validator builder
    custom: <T, K extends keyof T>(
        validate: (value: T[K], formData: T) => boolean | Promise<boolean>,
        message: string
    ): ValidationRule<T, K> => ({
        validate,
        message,
    }),
};

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useFormValidation<T extends Record<string, any>>({
    initialValues,
    validationRules: rules = {},
    validateOnChange = false,
    validateOnBlur = true,
    onSubmit,
    onError,
}: UseFormValidationOptions<T>): UseFormValidationReturn<T> {
    const { addToast } = useToast();

    const [values, setValuesState] = useState<T>(initialValues);
    const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
    const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Check if form has been modified
    const isDirty = useMemo(() => {
        return Object.keys(initialValues).some(
            key => values[key as keyof T] !== initialValues[key as keyof T]
        );
    }, [values, initialValues]);

    // Check if form is valid (no errors)
    const isValid = useMemo(() => {
        return Object.keys(errors).length === 0;
    }, [errors]);

    // Validate a single field
    const validateField = useCallback(async <K extends keyof T>(field: K): Promise<boolean> => {
        const fieldRules = rules[field];
        if (!fieldRules || fieldRules.length === 0) return true;

        for (const rule of fieldRules) {
            const isValid = await rule.validate(values[field], values);
            if (!isValid) {
                setErrors(prev => ({ ...prev, [field]: rule.message }));
                return false;
            }
        }

        // Clear error if all rules pass
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
        });

        return true;
    }, [values, rules]);

    // Validate entire form
    const validateForm = useCallback(async (): Promise<boolean> => {
        const newErrors: Partial<Record<keyof T, string>> = {};
        let isFormValid = true;

        for (const field of Object.keys(rules) as (keyof T)[]) {
            const fieldRules = rules[field];
            if (!fieldRules) continue;

            for (const rule of fieldRules) {
                const isValid = await rule.validate(values[field], values);
                if (!isValid) {
                    newErrors[field] = rule.message;
                    isFormValid = false;
                    break; // Stop at first error for this field
                }
            }
        }

        setErrors(newErrors);

        if (!isFormValid && onError) {
            onError(newErrors);
        }

        return isFormValid;
    }, [values, rules, onError]);

    // Set a single value
    const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
        setValuesState(prev => ({ ...prev, [field]: value }));

        if (validateOnChange) {
            // Defer validation to avoid stale closure
            setTimeout(() => validateField(field), 0);
        }
    }, [validateOnChange, validateField]);

    // Set multiple values
    const setValues = useCallback((newValues: Partial<T>) => {
        setValuesState(prev => ({ ...prev, ...newValues }));
    }, []);

    // Set error for a field
    const setError = useCallback(<K extends keyof T>(field: K, error: string) => {
        setErrors(prev => ({ ...prev, [field]: error }));
    }, []);

    // Clear error for a field
    const clearError = useCallback(<K extends keyof T>(field: K) => {
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
        });
    }, []);

    // Handle blur event
    const handleBlur = useCallback(<K extends keyof T>(field: K) => {
        setTouched(prev => ({ ...prev, [field]: true }));

        if (validateOnBlur) {
            validateField(field);
        }
    }, [validateOnBlur, validateField]);

    // Handle change event factory
    const handleChange = useCallback(<K extends keyof T>(field: K) => {
        return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
            const value = e.target.type === 'checkbox'
                ? (e.target as HTMLInputElement).checked
                : e.target.value;
            setValue(field, value as T[K]);
        };
    }, [setValue]);

    // Handle form submission
    const handleSubmit = useCallback(async (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }

        // Mark all fields as touched
        const allTouched = Object.keys(values).reduce((acc, key) => {
            acc[key as keyof T] = true;
            return acc;
        }, {} as Record<keyof T, boolean>);
        setTouched(allTouched);

        // Validate form
        const isFormValid = await validateForm();
        if (!isFormValid) {
            addToast('Please fix the validation errors', 'error');
            return;
        }

        // Submit
        setIsSubmitting(true);
        try {
            await onSubmit(values);
        } catch (error) {
            addToast(
                error instanceof Error ? error.message : 'Submission failed',
                'error'
            );
            throw error;
        } finally {
            setIsSubmitting(false);
        }
    }, [values, validateForm, onSubmit, addToast]);

    // Reset form
    const reset = useCallback((newValues?: Partial<T>) => {
        setValuesState({ ...initialValues, ...newValues });
        setErrors({});
        setTouched({});
        setIsSubmitting(false);
    }, [initialValues]);

    // Get props for a field (for easy binding)
    const getFieldProps = useCallback(<K extends keyof T>(field: K) => ({
        value: values[field],
        onChange: handleChange(field),
        onBlur: () => handleBlur(field),
        error: touched[field] ? errors[field] : undefined,
        touched: !!touched[field],
    }), [values, errors, touched, handleChange, handleBlur]);

    return {
        values,
        errors,
        touched,
        isSubmitting,
        isValid,
        isDirty,
        setValue,
        setValues,
        setError,
        clearError,
        handleBlur,
        handleChange,
        validateField,
        validateForm,
        handleSubmit,
        reset,
        getFieldProps,
    };
}
