'use client';

import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import type { AuthContextType } from '@/src/types/auth';

/**
 * useAuth Hook
 * Access authentication state and methods
 *
 * Usage:
 * const { user, login, logout, isLoading } = useAuth();
 *
 * Throws error if used outside AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

export default useAuth;
