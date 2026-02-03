
import { useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
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
            await login({ email, password });
            showSuccessToast('Successfully signed in!');

            // Handle redirect if callbackUrl is present
            const callbackUrl = searchParams.get('callbackUrl');
            if (callbackUrl) {
                router.push(callbackUrl);
            } else {
                router.push('/seller');
            }
        } catch (error: any) {
            handleApiError(error, 'Login failed');
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
