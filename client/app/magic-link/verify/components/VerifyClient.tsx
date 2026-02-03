"use client";

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { authApi } from '@/src/core/api/clients/auth/authApi';
import { useAuth } from '@/src/features/auth';
import { Card } from '@/src/components/ui';
import { showSuccessToast, handleApiError } from '@/src/lib/error';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

function MagicLinkVerifyContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { refreshUser } = useAuth();
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');

    useEffect(() => {
        const token = searchParams.get('token');

        if (!token) {
            setStatus('error');
            handleApiError(new Error('Invalid magic link'), 'Invalid magic link');
            return;
        }

        const verifyToken = async () => {
            try {
                await authApi.verifyMagicLink(token);
                await refreshUser();
                setStatus('success');
                showSuccessToast('Welcome back!');

                // Redirect after short delay
                setTimeout(() => {
                    router.push('/seller');
                }, 1500);
            } catch (error: any) {
                setStatus('error');
                handleApiError(error, 'Invalid or expired magic link');
            }
        };

        verifyToken();
    }, [searchParams, refreshUser, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
            <Card className="w-full max-w-md p-8 text-center space-y-4">
                {status === 'verifying' && (
                    <>
                        <Loader2 className="h-12 w-12 mx-auto text-[var(--primary-blue)] animate-spin" />
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                            Verifying Magic Link
                        </h1>
                        <p className="text-[var(--text-secondary)]">
                            Please wait while we sign you in...
                        </p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="mx-auto w-16 h-16 bg-[var(--success-bg)] rounded-full flex items-center justify-center">
                            <CheckCircle2 className="h-8 w-8 text-[var(--success)]" />
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                            Success!
                        </h1>
                        <p className="text-[var(--text-secondary)]">
                            You're being redirected to your dashboard...
                        </p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="mx-auto w-16 h-16 bg-[var(--error-bg)] rounded-full flex items-center justify-center">
                            <XCircle className="h-8 w-8 text-[var(--error)]" />
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                            Invalid Link
                        </h1>
                        <p className="text-[var(--text-secondary)]">
                            This magic link is invalid or has expired.
                        </p>
                        <button
                            onClick={() => router.push('/magic-link')}
                            className="text-[var(--primary-blue)] hover:underline"
                        >
                            Request a new magic link
                        </button>
                    </>
                )}
            </Card>
        </div>
    );
}

export function VerifyClient() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <Loader2 className="h-12 w-12 text-[var(--primary-blue)] animate-spin" />
            </div>
        }>
            <MagicLinkVerifyContent />
        </Suspense>
    );
}
