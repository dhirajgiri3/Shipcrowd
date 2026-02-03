
import { useState, FormEvent } from 'react';
import { authApi } from '@/src/core/api/clients/auth/authApi';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

export function useMagicLink() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setIsSuccess(false);

        try {
            await authApi.requestMagicLink(email);
            setIsSuccess(true);
            showSuccessToast('Magic link sent! Check your email.');
        } catch (error: any) {
            handleApiError(error, 'Failed to send magic link');
        } finally {
            setIsLoading(false);
        }
    };

    return {
        email,
        setEmail,
        isLoading,
        isSuccess,
        handleSubmit
    };
}
