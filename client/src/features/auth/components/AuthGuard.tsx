'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import type { User } from '@/src/types/auth';

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

    // ✅ Dev mode bypass with explicit environment variable (CRITICAL SECURITY)
    // Only bypass auth if BOTH conditions are true:
    // 1. NODE_ENV === 'development'
    // 2. NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' (explicit opt-in)
    const isDevBypass =
      process.env.NODE_ENV === 'development' &&
      process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true';

    if (isDevBypass) {
      console.warn('[AuthGuard] DEV MODE: Auth bypass enabled for', pathname);
      setShouldRender(true);
      return;
    }

    // ✅ ALWAYS check authentication in production and when bypass is disabled
    if (!isAuthenticated) {
      // If redirecting to login, append current path so user can be redirected back
      if (redirectTo === '/login' && pathname && pathname !== '/') {
        router.push(`${redirectTo}?redirect=${encodeURIComponent(pathname)}`);
      } else {
        router.push(redirectTo);
      }
      return;
    }

    // Check role-based access
    if (requiredRole && user) {
      const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!allowedRoles.includes(user.role)) {
        // Redirect to user's default dashboard instead of generic unauthorized page for better UX
        const destination = user.role === 'admin' ? '/admin' : '/seller';
        if (pathname !== destination) {
          router.push(destination);
        }
        return;
      }
    }

    setShouldRender(true);
  }, [isInitialized, isAuthenticated, user, requiredRole, redirectTo, router, pathname]);

  // Show loading state while checking auth
  if (!isInitialized) {
    return loadingFallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render until auth check complete
  if (!shouldRender) return null;

  return <>{children}</>;
}

export default AuthGuard;
