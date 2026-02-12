import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { getDefaultRedirectForUser, isAllowedRedirectPath } from '@/src/config/redirect';
import { showSuccessToast } from '@/src/lib/error';

export type VerificationStatus = 'loading' | 'success' | 'error' | 'already_verified' | 'expired';

export function useVerifyEmail() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const emailParam = searchParams.get('email');

    const { verifyEmail, resendVerification } = useAuth();

    const [status, setStatus] = useState<VerificationStatus>('loading');
    const [message, setMessage] = useState('');
    const [countdown, setCountdown] = useState(5);
    const [isResending, setIsResending] = useState(false);
    const [canResend, setCanResend] = useState(true);
    const [redirectDestination, setRedirectDestination] = useState<'dashboard' | 'onboarding'>('dashboard');

    useEffect(() => {
        if (!token) {
            setStatus('expired');
            setMessage('No verification token provided. Please check your email for the verification link.');
            return;
        }

        const verify = async () => {
            try {
                const result = await verifyEmail(token);
                if (result.success) {
                    setStatus('success');
                    setMessage('Email verified successfully!');

                    const responseData = result.data as { redirectUrl?: string; user?: { role?: string; companyId?: string | null } } | undefined;
                    const userForRedirect =
                        responseData?.user?.role
                            ? { role: responseData.user.role, companyId: responseData.user.companyId ?? null }
                            : undefined;

                    const destination =
                        (responseData?.redirectUrl && isAllowedRedirectPath(responseData.redirectUrl))
                            ? responseData.redirectUrl
                            : getDefaultRedirectForUser(userForRedirect) || '/seller';
                    setRedirectDestination(destination.includes('admin') ? 'dashboard' : 'dashboard');

                    const timer = setInterval(() => {
                        setCountdown((prev) => {
                            if (prev <= 1) {
                                clearInterval(timer);
                                router.push(destination);
                                return 0;
                            }
                            return prev - 1;
                        });
                    }, 1000);

                    return () => clearInterval(timer);
                } else {
                    const errorMsg = result.error?.message || 'Verification failed';
                    if (errorMsg.toLowerCase().includes('already verified')) {
                        setStatus('already_verified');
                        setMessage('This email has already been verified. You can proceed to login.');
                    } else if (errorMsg.toLowerCase().includes('expired') || errorMsg.toLowerCase().includes('invalid')) {
                        setStatus('expired');
                        setMessage('Your verification link has expired. Please request a new one.');
                    } else {
                        setStatus('error');
                        setMessage(errorMsg);
                    }
                }
            } catch (err: any) {
                setStatus('error');
                setMessage(err.message || 'Verification failed');
            }
        };

        verify();
    }, [token, verifyEmail, router]);

    const handleResendVerification = async () => {
        if (!canResend || isResending || !emailParam) return;

        setIsResending(true);
        try {
            const result = await resendVerification(emailParam);
            if (result.success) {
                showSuccessToast('Verification email resent! Please check your inbox.');
                setCanResend(false);
                setTimeout(() => setCanResend(true), 60000);
            }
        } catch (err: any) {
            console.error('Resend error', err);
        } finally {
            setIsResending(false);
        }
    };

    return {
        status,
        message,
        countdown,
        isResending,
        canResend,
        redirectDestination,
        handleResendVerification,
        email: emailParam
    };
}
