import { useState } from 'react';
import { z } from 'zod';
import { authApi } from '@/src/core/api/clients/auth/authApi';
import { showSuccessToast, handleApiError } from '@/src/lib/error';

const emailSchema = z.string().email('Please enter a valid email address');

export function useAccountRecovery() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const validateEmail = (email: string) => {
        const result = emailSchema.safeParse(email);
        if (!result.success) {
            setError(result.error.issues[0].message);
            return false;
        }
        setError(null);
        return true;
    };

    const handleEmailChange = (value: string) => {
        setEmail(value);
        if (error) setError(null);
    };

    const submitRequest = async () => {
        if (!validateEmail(email)) return;

        setIsLoading(true);
        setError(null);

        try {
            await authApi.requestAccountRecovery(email);
            setSent(true);
            showSuccessToast('Recovery email sent!');
        } catch (err: any) {
            handleApiError(err, 'Failed to send recovery email');
            setError('Failed to process request. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setEmail('');
        setSent(false);
        setError(null);
    };

    return {
        email,
        handleEmailChange,
        isLoading,
        sent,
        error,
        submitRequest,
        resetForm
    };
}
