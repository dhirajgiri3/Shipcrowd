'use client';

import { Suspense } from 'react';
import { Loader } from '@/src/components/ui/feedback/Loader';
import { useOAuthCallback } from '@/src/core/api/hooks/auth/useOAuthCallback';

function OAuthCallbackContent() {
    const { authChecked } = useOAuthCallback();

    return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
            <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-6">
                    <Loader variant="spinner" size="lg" />
                </div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                    {authChecked ? 'Redirecting to dashboard...' : 'Completing your sign-in...'}
                </h2>
                <p className="text-[var(--text-secondary)]">
                    {authChecked ? 'Just a moment...' : 'Please wait while we set up your account'}
                </p>
            </div>
        </div>
    );
}

export function OAuthCallbackClient() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
                    <Loader variant="spinner" size="lg" />
                </div>
            }
        >
            <OAuthCallbackContent />
        </Suspense>
    );
}
