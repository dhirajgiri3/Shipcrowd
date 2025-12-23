/**
 * Auth Feature - Barrel Export
 * 
 * Authentication-related components, hooks, and context.
 */

// Context
export { AuthProvider, useAuth } from './context/AuthContext';
export type { AuthUser, LoginCredentials, SignupData, AuthContextType } from './context/AuthContext';

// Components
export { AuthGuard, GuestGuard } from './components/AuthGuard';
