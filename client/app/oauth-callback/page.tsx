'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

function OAuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const token = searchParams.get('token');
        const error = searchParams.get('error');

        if (error) {
            // Handle OAuth error
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

        if (token) {
            // Store access token with the correct key that the API client expects
            localStorage.setItem('shipcrowd_token', token);

            toast.success('Successfully signed in with Google!');

            // Redirect to dashboard
            setTimeout(() => {
                router.push('/seller');
            }, 500);
        } else {
            toast.error('Invalid OAuth response');
            router.push('/login');
        }
    }, [searchParams, router]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-6">
                    {/* Animated loading spinner */}
                    <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-primaryBlue border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Completing your sign-in...
                </h2>
                <p className="text-gray-600">
                    Please wait while we set up your account
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
