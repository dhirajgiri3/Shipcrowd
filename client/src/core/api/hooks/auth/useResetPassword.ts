
import { useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import { toast } from 'sonner';

export function useResetPassword() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { resetPassword } = useAuth();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!token) {
            toast.error('Missing reset token');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setIsLoading(true);

        try {
            await resetPassword(token, password);
            showSuccessToast('Password reset successfully');
            router.push('/login');
        } catch (error: any) {
            handleApiError(error, 'Failed to reset password');
        } finally {
            setIsLoading(false);
        }
    };

    return {
        token, // Return token so the UI can show error if missing
        password,
        setPassword,
        confirmPassword,
        setConfirmPassword,
        isLoading,
        showPassword,
        setShowPassword,
        showConfirmPassword,
        setShowConfirmPassword,
        handleSubmit
    };
}
