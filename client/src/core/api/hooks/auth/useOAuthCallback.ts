
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { authApi } from '@/src/core/api/clients/auth/authApi';
import { clearCSRFToken, prefetchCSRFToken } from '@/src/core/api/http';
import { toast } from 'sonner';
import { showSuccessToast } from '@/src/lib/error';

export function useOAuthCallback() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { refreshUser } = useAuth();
    const processedRef = useRef(false);
    const [authChecked, setAuthChecked] = useState(false);

    useEffect(() => {
        if (processedRef.current) return;

        const handleOAuthCallback = async () => {
            processedRef.current = true;
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
                // ✅ Rotate CSRF token after OAuth login to avoid anonymous token reuse
                clearCSRFToken();
                await prefetchCSRFToken().catch((err) => {
                    console.warn('[CSRF] Prefetch after OAuth login failed:', err);
                });

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
    }, [searchParams, router, refreshUser]);

    return {
        authChecked
    };
}
