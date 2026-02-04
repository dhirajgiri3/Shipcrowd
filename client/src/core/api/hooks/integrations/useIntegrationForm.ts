import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/src/components/ui/feedback/Toast';

interface UseIntegrationFormProps<T> {
    integrationType: string;
    initialState: T;
    onValidate?: (data: T) => boolean;
}

export function useIntegrationForm<T>({
    integrationType,
    initialState,
    onValidate
}: UseIntegrationFormProps<T>) {
    const [formData, setFormData] = useState<T>(initialState);
    const [isDirty, setIsDirty] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const { addToast } = useToast();

    // Load from localStorage on mount
    useEffect(() => {
        const savedData = localStorage.getItem(`integration_draft_${integrationType}`);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                setFormData(parsed);
                addToast('Draft configuration restore', 'info');
            } catch (e) {
                console.error('Failed to parse draft data', e);
            }
        }
    }, [integrationType, addToast]);

    // Auto-save to localStorage when data changes
    useEffect(() => {
        if (!isDirty) return;

        const timer = setTimeout(() => {
            localStorage.setItem(`integration_draft_${integrationType}`, JSON.stringify(formData));
            setLastSaved(new Date());
        }, 1000); // Debounce save

        return () => clearTimeout(timer);
    }, [formData, integrationType, isDirty]);

    const updateField = useCallback((field: keyof T, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
    }, []);

    const setAllFields = useCallback((data: T) => {
        setFormData(data);
        setIsDirty(true);
    }, []);

    const clearDraft = useCallback(() => {
        localStorage.removeItem(`integration_draft_${integrationType}`);
        setFormData(initialState);
        setIsDirty(false);
        setLastSaved(null);
    }, [integrationType, initialState]);

    return {
        formData,
        updateField,
        setAllFields,
        clearDraft,
        isDirty,
        lastSaved
    };
}
