'use client';

import { useEffect, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import { toast } from 'sonner';
import { useAuth } from '@/src/features/auth';
import { authApi } from '@/src/core/api/clients/authApi';
import { Loader } from '@/src/components/ui';

function OAuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { refreshUser, user } = useAuth();
    const [authChecked, setAuthChecked] = useState(false);

    useEffect(() => {
        const handleOAuthCallback = async () => {
            const error = searchParams.get('error');

            if (error) {
                let errorMessage = 'Authentication failed';

                if (error === 'oauth_failed') {
                    errorMessage = 'Google authentication failed. Please try again.';
                } else if (error === 'server_error') {
                    errorMessage = 'Server error during authentication. Please try again later.';
                } else if (error === 'google-auth-failed') {
                    errorMessage = 'Google login was cancelled or failed.';
                }

                toast.error(errorMessage);
                router.push('/login');
                return;
            }

            // Success path: Verify cookies were set and sync AuthContext
            try {
                // Wait for auth state to sync (cookies should be set by backend)
                await refreshUser();

                // ✅ Get fresh user data AFTER refresh to avoid stale closure
                const userData = await authApi.getMe();
                setAuthChecked(true);

                showSuccessToast('Successfully signed in with Google!');

                // Small delay for toast visibility, then redirect
                setTimeout(() => {
                    // ✅ Use fresh userData, not stale user from closure
                    const destination = userData?.companyId ? '/seller' : '/onboarding';
                    router.push(destination);
                }, 800);
            } catch (err) {
                // If refreshUser fails, cookies weren't set properly
                console.error('[OAuth] Failed to sync auth after callback:', err);
                toast.error('Authentication succeeded but session setup failed. Please try logging in again.');
                router.push('/login');
            }
        };

        handleOAuthCallback();
    }, [searchParams, router, refreshUser]); // ✅ Removed `user` to prevent stale closure

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-6">
                    <Loader variant="spinner" size="xl" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {authChecked ? 'Redirecting to dashboard...' : 'Completing your sign-in...'}
                </h2>
                <p className="text-gray-600">
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
                <div className="flex min-h-screen items-center justify-center">
                    <Loader variant="spinner" size="lg" />
                </div>
            }
        >
            <OAuthCallbackContent />
        </Suspense>
    );
}
