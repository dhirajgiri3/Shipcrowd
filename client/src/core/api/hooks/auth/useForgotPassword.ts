import { useState, FormEvent } from 'react';
import { authApi } from '@/src/core/api/clients/auth/authApi';
import { normalizeError } from '@/src/core/api/http';
import { getAuthErrorMessage } from '@/src/lib/error';

export function useForgotPassword() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<{ code?: string; message?: string } | null>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setIsSuccess(false);
        setError(null);

        try {
            await authApi.resetPassword(email);
            setIsSuccess(true);
        } catch (err: unknown) {
            const normalized = normalizeError(err as any);
            setError(normalized);
        } finally {
            setIsLoading(false);
        }
    };

    const clearError = () => setError(null);

    return {
        email,
        setEmail,
        isLoading,
        isSuccess,
        error,
        clearError,
        errorMessage: error ? getAuthErrorMessage(error) : null,
        handleSubmit
    };
}
