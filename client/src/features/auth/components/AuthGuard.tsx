"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/features/auth';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
    children: React.ReactNode;
    /** Where to redirect if not authenticated (default: /login) */
    redirectTo?: string;
    /** Require user to have a company (for onboarded users) */
    requireCompany?: boolean;
    /** Allow only specific roles */
    allowedRoles?: ('admin' | 'seller' | 'staff' | 'user')[];
    /** Require KYC to be approved */
    requireKycApproved?: boolean;
    /** Require company to be active */
    requireCompanyActive?: boolean;
    /** Required permissions (any match) */
    requiredPermissions?: string[];
}

/**
 * Auth Guard Component
 * Protects routes that require authentication
 * 
 * Usage:
 * <AuthGuard>
 *   <ProtectedPage />
 * </AuthGuard>
 * 
 * With options:
 * <AuthGuard requireCompany allowedRoles={['seller', 'admin']}>
 *   <SellerDashboard />
 * </AuthGuard>
 */
export function AuthGuard({
    children,
    redirectTo = '/login',
    requireCompany = false,
    allowedRoles,
    requireKycApproved = false,
    requireCompanyActive = false,
    requiredPermissions,
}: AuthGuardProps) {
    const router = useRouter();
    const { user, isLoading, isAuthenticated } = useAuth();

    useEffect(() => {
        if (isLoading) return;

        // Not authenticated
        if (!isAuthenticated) {
            router.push(redirectTo);
            return;
        }

        // Need company but don't have one
        if (requireCompany && !user?.companyId) {
            router.push('/onboarding');
            return;
        }

        // Role check
        if (allowedRoles && user && !allowedRoles.includes(user.role)) {
            router.push('/unauthorized');
            return;
        }

        // KYC check
        if (requireKycApproved && !user?.kycStatus?.isComplete) {
            // Allow admin to bypass KYC requirement
            if (user?.role !== 'admin') {
                router.push('/seller/kyc');
                return;
            }
        }

        // Company status check
        if (requireCompanyActive && user?.companyStatus !== 'active') {
            if (user?.role !== 'admin') {
                router.push('/seller/settings/profile?error=company_inactive');
                return;
            }
        }

        // Permission check (user needs at least one of the required permissions)
        if (requiredPermissions && requiredPermissions.length > 0 && user) {
            const hasPermission = requiredPermissions.some(perm =>
                user.permissions?.includes(perm)
            );

            if (!hasPermission && user.role !== 'admin') {
                router.push('/unauthorized');
                return;
            }
        }
    }, [isLoading, isAuthenticated, user, requireCompany, allowedRoles, requireKycApproved, requireCompanyActive, requiredPermissions, redirectTo, router]);

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 text-primaryBlue animate-spin" />
            </div>
        );
    }

    // Not ready to show content
    if (!isAuthenticated) return null;
    if (requireCompany && !user?.companyId) return null;
    if (allowedRoles && user && !allowedRoles.includes(user.role)) return null;
    if (requireKycApproved && !user?.kycStatus?.isComplete && user?.role !== 'admin') return null;
    if (requireCompanyActive && user?.companyStatus !== 'active' && user?.role !== 'admin') return null;
    if (requiredPermissions && requiredPermissions.length > 0 && user) {
        const hasPermission = requiredPermissions.some(perm => user.permissions?.includes(perm));
        if (!hasPermission && user.role !== 'admin') return null;
    }

    return <>{children}</>;
}

/**
 * Guest Guard Component
 * For pages that should only be accessible to non-authenticated users (login, signup)
 */
export function GuestGuard({
    children,
    redirectTo = '/seller',
}: {
    children: React.ReactNode;
    redirectTo?: string;
}) {
    const router = useRouter();
    const { isLoading, isAuthenticated, user } = useAuth();

    useEffect(() => {
        if (isLoading) return;

        if (isAuthenticated) {
            // Redirect based on company status
            const destination = user?.companyId ? redirectTo : '/onboarding';
            router.push(destination);
        }
    }, [isLoading, isAuthenticated, user, redirectTo, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 text-primaryBlue animate-spin" />
            </div>
        );
    }

    if (isAuthenticated) return null;

    return <>{children}</>;
}
