
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { companyApi, CreateCompanyData } from '@/src/core/api';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import { isValidGSTIN, isValidPAN, isValidPincode } from '@/src/lib/utils';
import { toast } from 'sonner';

export const TOTAL_ONBOARDING_STEPS = 5;

export interface OnboardingFormData {
    name: string;
    address: {
        line1: string;
        line2: string;
        city: string;
        state: string;
        country: string;
        postalCode: string;
    };
    billingInfo: {
        gstin: string;
        pan: string;
    };
}

const INITIAL_DATA: OnboardingFormData = {
    name: "",
    address: {
        line1: "",
        line2: "",
        city: "",
        state: "",
        country: "India",
        postalCode: "",
    },
    billingInfo: {
        gstin: "",
        pan: "",
    },
};

export function useOnboarding() {
    const router = useRouter();
    const { user, isLoading: authLoading, isAuthenticated, refreshUser, logout } = useAuth();

    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [formData, setFormData] = useState<OnboardingFormData>(INITIAL_DATA);

    // Load draft from localStorage
    useEffect(() => {
        const savedDraft = localStorage.getItem('onboarding_draft');
        const savedStep = localStorage.getItem('onboarding_step');

        if (savedDraft) {
            try {
                const draft = JSON.parse(savedDraft);
                setFormData(draft);
                toast.info("Restored your saved progress");
            } catch (e) {
                console.error("Failed to load draft:", e);
            }
        }

        if (savedStep) {
            const parsedStep = parseInt(savedStep);
            if (parsedStep >= 1 && parsedStep <= TOTAL_ONBOARDING_STEPS) {
                setStep(parsedStep);
            }
        }
    }, []);

    // Auto-save draft
    const saveDraft = useCallback(async () => {
        setIsSavingDraft(true);
        try {
            localStorage.setItem('onboarding_draft', JSON.stringify(formData));
            localStorage.setItem('onboarding_step', step.toString());
        } catch (e) {
            console.error("Failed to save draft:", e);
        } finally {
            setIsSavingDraft(false);
        }
    }, [formData, step]);

    // Auto-save effect
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (step > 1 && step < 5) {
                saveDraft();
            }
        }, 1500);
        return () => clearTimeout(timeoutId);
    }, [formData, step, saveDraft]);

    // Auth guard
    useEffect(() => {
        if (!authLoading) {
            if (!isAuthenticated) {
                router.push("/login");
            } else if (user?.companyId) {
                router.push("/seller");
            } else if (step === 1 && user?.isEmailVerified) {
                setStep(2);
            }
        }
    }, [authLoading, isAuthenticated, user, router, step]);

    const updateField = (field: string, value: string) => {
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            setFormData((prev: any) => ({
                ...prev,
                [parent]: { ...(prev[parent as any] as object), [child]: value }
            }));
        } else {
            setFormData((prev: any) => ({ ...prev, [field]: value }));
        }
    };

    const handleAddressChange = useCallback((addr: any) => {
        setFormData((prev) => ({
            ...prev,
            address: {
                line1: addr.line1 || '',
                line2: addr.line2 || '',
                city: addr.city || '',
                state: addr.state || '',
                postalCode: addr.pincode || '',
                country: 'India',
            },
        }));
    }, []);

    const validateField = (field: string, value: string): string | null => {
        switch (field) {
            case 'name':
                if (!value.trim()) return "Enter your company name";
                if (value.trim().length < 2) return "Company name must be at least 2 characters";
                return null;
            case 'billingInfo.gstin':
                if (value && !isValidGSTIN(value)) return "GSTIN should be 15 characters";
                return null;
            case 'billingInfo.pan':
                if (value && !isValidPAN(value)) return "PAN should be 10 characters";
                return null;
            default:
                return null;
        }
    };

    const handleBlur = (field: string, value: string) => {
        setTouched(prev => ({ ...prev, [field]: true }));
        const error = validateField(field, value);
        setFieldErrors(prev => ({ ...prev, [field]: error || "" }));
    };

    const validateStep = (stepNum: number): boolean => {
        setError(null);
        setFieldErrors({});
        let isValid = true;
        const newFieldErrors: Record<string, string> = {};

        if (stepNum === 2) {
            const nameError = validateField('name', formData.name);
            if (nameError) {
                newFieldErrors.name = nameError;
                isValid = false;
            }
        }

        if (stepNum === 3) {
            const { line1, city, state, postalCode } = formData.address;
            const missing: string[] = [];
            if (!line1?.trim()) missing.push('Address Line 1');
            if (!city?.trim()) missing.push('City');
            if (!state) missing.push('State');
            if (!postalCode) missing.push('Postal Code');

            if (missing.length > 0) {
                setError(`Please complete: ${missing.join(', ')}`);
                return false;
            }
            if (!isValidPincode(postalCode)) {
                setError("Enter a valid 6-digit pincode");
                return false;
            }
        }

        if (stepNum === 4) {
            const gstin = formData.billingInfo?.gstin || "";
            const pan = formData.billingInfo?.pan || "";

            const gstinError = validateField('billingInfo.gstin', gstin);
            if (gstinError) {
                newFieldErrors['billingInfo.gstin'] = gstinError;
                isValid = false;
            }

            const panError = validateField('billingInfo.pan', pan);
            if (panError) {
                newFieldErrors['billingInfo.pan'] = panError;
                isValid = false;
            }
        }

        if (!isValid) {
            setFieldErrors(newFieldErrors);
            if (stepNum === 2) setError("Please fix the errors below");
        }

        return isValid;
    };

    const nextStep = async () => {
        if (validateStep(step)) {
            setIsTransitioning(true);
            await new Promise(r => setTimeout(r, 150));
            setStep(s => s + 1);
            saveDraft();
            setIsTransitioning(false);
        }
    };

    const prevStep = () => setStep(s => s - 1);

    const handleSubmit = async () => {
        if (!validateStep(4)) return;

        setIsLoading(true);
        setError(null);

        try {
            const companyData: CreateCompanyData = {
                name: formData.name,
                address: {
                    line1: formData.address.line1,
                    line2: formData.address.line2 || undefined,
                    city: formData.address.city,
                    state: formData.address.state,
                    country: formData.address.country || 'India',
                    postalCode: formData.address.postalCode,
                },
                billingInfo: formData.billingInfo.gstin || formData.billingInfo.pan ? {
                    gstin: formData.billingInfo.gstin || undefined,
                    pan: formData.billingInfo.pan || undefined,
                } : undefined,
            };

            await companyApi.createCompany(companyData);
            await refreshUser();

            localStorage.removeItem('onboarding_draft');
            localStorage.removeItem('onboarding_step');

            setStep(5);
            showSuccessToast('Company created successfully!');
        } catch (err: any) {
            handleApiError(err, 'Failed to create company');
            // Also set local error state for alert
            setError(err.response?.data?.message || err.message || "Failed to create company");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await saveDraft();
            await logout();
            router.replace('/login');
        } catch (err) {
            console.error('Logout error:', err);
            toast.error('Logout failed');
        }
    };

    return {
        step,
        formData,
        isLoading,
        isSavingDraft,
        isTransitioning,
        error,
        setError,
        fieldErrors,
        touched,
        user,
        authLoading,
        isAuthenticated,
        updateField,
        handleBlur,
        nextStep,
        prevStep,
        handleSubmit,
        handleLogout,
        handleAddressChange
    };
}
