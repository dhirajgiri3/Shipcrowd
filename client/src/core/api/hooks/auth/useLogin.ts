import { useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { getLoginRedirect } from '@/src/config/redirect';

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
                // Error is set in AuthContext; LoginClient displays it inline via Alert
                return;
            }

            const redirectTo = getLoginRedirect(result.user ?? undefined, searchParams);
            router.push(redirectTo);
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
