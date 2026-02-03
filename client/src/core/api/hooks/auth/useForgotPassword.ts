
import { useState, FormEvent } from 'react';
import { authApi } from '@/src/core/api/clients/auth/authApi';
import { handleApiError } from '@/src/lib/error';

export function useForgotPassword() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setIsSuccess(false);

        try {
            await authApi.resetPassword(email);
            setIsSuccess(true);
        } catch (error: any) {
            handleApiError(error, 'Failed to send reset link');
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
