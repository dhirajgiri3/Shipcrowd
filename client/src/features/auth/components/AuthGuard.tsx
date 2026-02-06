'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import { getDefaultRedirectForUser } from '@/src/config/redirect';
import type { User } from '@/src/types/auth';
import { Loader } from '@/src/components/ui/feedback/Loader';

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: User['role'] | User['role'][];
  redirectTo?: string;
  loadingFallback?: ReactNode;
}

/**
 * AuthGuard Component
 * 
 * Protects routes that require authentication.
 * 
 * Dev Mode: /seller/* and /admin/* routes are accessible without auth
 * Production: All protected routes require authentication
 * 
 * Features:
 * - Redirects unauthenticated users to login
 * - Role-based access control
 * - Loading state during auth check
 * - Smooth UX with no flash of content
 */
export function AuthGuard({
  children,
  requiredRole,
  redirectTo = '/login',
  loadingFallback,
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isInitialized } = useAuth();
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (!isInitialized) return;

    // ✅ ALWAYS check authentication (Bypass removed for security)

    // ✅ ALWAYS check authentication in production and when bypass is disabled
    if (!isAuthenticated) {
      // If redirecting to login, append current path so user can be redirected back
      if (redirectTo === '/login' && pathname && pathname !== '/') {
        router.replace(`${redirectTo}?redirect=${encodeURIComponent(pathname)}`);
      } else {
        router.replace(redirectTo);
      }
      return;
    }

    // Check role-based access
    if (requiredRole && user) {
      const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

      // ✅ FIX: Role hierarchy - super_admin has all admin privileges
      const isSuperAdmin = user.role === 'super_admin';
      const isAdminAccessingSeller = (user.role === 'admin' || isSuperAdmin) && allowedRoles.includes('seller');

      // Super admin can access any admin or seller route
      const hasRequiredRole = allowedRoles.includes(user.role) ||
        (isSuperAdmin && allowedRoles.includes('admin'));

      if (!hasRequiredRole && !isAdminAccessingSeller) {
        const destination = getDefaultRedirectForUser(user);
        if (pathname !== destination && !pathname.startsWith(`${destination}/`)) {
          router.replace(destination);
        }
        return;
      }
    }

    setShouldRender(true);
  }, [isInitialized, isAuthenticated, user, requiredRole, redirectTo, router, pathname]);

  // Show loading state while checking auth
  if (!isInitialized) {
    return loadingFallback || (
      <Loader variant="truck" fullScreen message="Loading Shipcrowd..." />
    );
  }

  // Don't render until auth check complete
  if (!shouldRender) return null;

  return <>{children}</>;
}

export default AuthGuard;
