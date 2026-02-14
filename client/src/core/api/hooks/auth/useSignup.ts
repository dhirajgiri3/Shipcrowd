import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { showSuccessToast, showErrorToast } from '@/src/lib/error';
import { consentApi } from '@/src/core/api/clients/auth/consentApi';

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
            showErrorToast('Passwords do not match. Please ensure both passwords are identical.');
            return;
        }

        if (!termsAccepted) {
            showErrorToast('Please accept the Terms of Service and Privacy Policy to continue.');
            return;
        }

        setIsLoading(true);

        try {
            const result = await register({ name, email, password });

            if (!result.success) {
                // Error is set in AuthContext; SignupClient displays it inline via Alert
                return;
            }

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
