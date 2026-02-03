'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';
import { handleApiError } from '@/src/lib/error';

/**
 * Centralized logout handler with safe redirect.
 * Keeps server as source of truth and avoids duplicated logic.
 */
export function useLogoutRedirect(redirectTo: string = '/login') {
  const router = useRouter();
  const { logout, isLoggingOut } = useAuth();

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.replace(redirectTo);
    } catch (err) {
      handleApiError(err, 'Failed to log out. Please try again.');
    }
  }, [logout, router, redirectTo]);

  return { handleLogout, isLoggingOut };
}

export default useLogoutRedirect;
