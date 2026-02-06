import { useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { getLoginRedirect } from '@/src/config/redirect';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

export function useLogin() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await login({ email, password });

            if (!result.success) {
                // Determine if we should show the error based on result
                // The context already sets the error state, but we need to stop execution here
                // to prevent the success toast and redirect
                throw new Error(result.error?.message || 'Login failed');
            }

            showSuccessToast('Successfully signed in!');

            const redirectTo = getLoginRedirect(result.user ?? undefined, searchParams);
            router.push(redirectTo);
        } catch (error: any) {
            // Error is already handled by context or normalized above, 
            // but we need to ensure local state is clean
            // The handleApiError utility might be redundant if context handles it, 
            // but it's good for toast notifications
            if (error.message !== 'Login failed') {
                handleApiError(error, 'Login failed');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return {
        email,
        setEmail,
        password,
        setPassword,
        isLoading,
        showPassword,
        togglePasswordVisibility,
        handleSubmit
    };
}
