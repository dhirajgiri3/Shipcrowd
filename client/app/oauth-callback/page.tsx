'use client';

import { useEffect, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/src/features/auth';

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
                setAuthChecked(true);

                toast.success('Successfully signed in with Google!');

                // Small delay for toast visibility, then redirect
                setTimeout(() => {
                    // Redirect based on onboarding status
                    const destination = user?.companyId ? '/seller' : '/onboarding';
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
    }, [searchParams, router, refreshUser, user]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-6">
                    {/* Animated loading spinner */}
                    <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-primaryBlue border-t-transparent rounded-full animate-spin"></div>
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

export default function OAuthCallbackPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primaryBlue"></div>
                </div>
            }
        >
            <OAuthCallbackContent />
        </Suspense>
    );
}
