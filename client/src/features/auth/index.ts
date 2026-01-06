/**
 * Auth Feature - Barrel Export
 * 
 * Authentication-related components, hooks, and context.
 */

// Context
export { AuthProvider } from './context/AuthContext';

// Hooks
export { useAuth } from './hooks/useAuth';

// Components
export { AuthGuard } from './components/AuthGuard';

// Types (from centralized types)
export type { AuthContextType, User, LoginRequest, RegisterRequest } from '@/src/types/auth';

