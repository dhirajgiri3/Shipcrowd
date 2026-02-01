'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { useEffect } from 'react';
import { Loader } from '@/src/components/ui/feedback/Loader';

interface OnboardingGuardProps {
    children: React.ReactNode;
}

/**
 * Onboarding Guard
 * Prevents users who already have a company from accessing the onboarding flow.
 * Redirects them to their dashboard instead.
 */
export const OnboardingGuard = ({ children }: OnboardingGuardProps) => {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // If user already has a company, redirect to dashboard
        if (!isLoading && user?.companyId) {
            const redirectPath = ['admin', 'super_admin'].includes(user.role) ? '/admin' : '/seller';
            router.push(redirectPath);
        }
    }, [user, isLoading, router]);

    // Show loading state while checking auth
    if (isLoading) {
        return (
            <Loader
                variant="truck"
                fullScreen
                message="Checking account status..."
                subMessage="Please wait while we verify your details"
            />
        );
    }

    // If user has company, show nothing (will redirect via useEffect)
    if (user?.companyId) {
        return null;
    }

    // Otherwise, allow access to onboarding
    return <>{children}</>;
};
