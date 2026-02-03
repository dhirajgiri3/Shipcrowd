
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import { consentApi } from '@/src/core/api/clients/auth/consentApi';
import { toast } from 'sonner';

export function useSignup() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const { register } = useAuth();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (!termsAccepted) {
            toast.error('Please accept the Terms and Conditions');
            return;
        }

        setIsLoading(true);

        try {
            // 1. Register the user
            await register({ name, email, password });

            // 2. Accept terms
            try {
                await consentApi.acceptConsent('terms', '1.0');
                await consentApi.acceptConsent('privacy', '1.0');
            } catch (consentError) {
                console.error('Failed to record consent:', consentError);
                // Continue anyway as registration succeeded
            }

            showSuccessToast('Account created successfully! Please verify your email.');
            router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        } catch (error: any) {
            handleApiError(error, 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };

    return {
        name,
        setName,
        email,
        setEmail,
        password,
        setPassword,
        confirmPassword,
        setConfirmPassword,
        isLoading,
        showPassword,
        setShowPassword,
        showConfirmPassword,
        setShowConfirmPassword,
        termsAccepted,
        setTermsAccepted,
        handleSubmit
    };
}
