/**
 * Centralized Route Configuration
 * 
 * Single source of truth for all route definitions.
 * Used by middleware, API client, and auth context.
 * 
 * SECURITY NOTE: Be very careful when modifying these lists.
 * Adding a route to PUBLIC_ROUTES means unauthenticated users can access it.
 */

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC ROUTES - Accessible without authentication
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Routes that don't require any authentication.
 * These are accessible to all users including unauthenticated visitors.
 */
export const PUBLIC_ROUTES = [
    '/',                        // Landing page
    '/login',                   // Login page
    '/signup',                  // Signup page
    '/forgot-password',         // Forgot password page
    '/reset-password',          // Reset password page
    '/verify-email',            // Email verification page
    '/verify-email-change',     // Email change verification
    '/oauth-callback',          // OAuth callback
    '/track',                   // Public shipment tracking page
    '/about',                   // About page
    '/contact',                 // Contact page
    '/pricing',                 // Pricing page
    '/terms',                   // Terms of service
    '/privacy',                 // Privacy policy
] as const;

/**
 * Routes that are specifically for guests (non-authenticated users).
 * Authenticated users accessing these will be redirected to dashboard.
 * These are a SUBSET of PUBLIC_ROUTES.
 */
export const GUEST_ONLY_ROUTES = [
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// PROTECTED ROUTES - Require authentication
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Routes that require admin role
 */
export const ADMIN_ROUTES = [
    '/admin',
] as const;

/**
 * Routes that require seller or admin role
 */
export const SELLER_ROUTES = [
    '/seller',
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if a path is a public route (exact match or starts with)
 */
export function isPublicRoute(pathname: string): boolean {
    return PUBLIC_ROUTES.some(route =>
        pathname === route || pathname.startsWith(`${route}/`)
    );
}

/**
 * Check if a path is a guest-only route (login, signup, etc.)
 * Authenticated users should be redirected away from these pages.
 */
export function isGuestOnlyRoute(pathname: string): boolean {
    return GUEST_ONLY_ROUTES.some(route =>
        pathname === route || pathname.startsWith(`${route}/`)
    );
}

/**
 * Check if a path should skip auth initialization.
 * Used by AuthContext to avoid unnecessary API calls on auth pages.
 * 
 * This includes:
 * - Guest-only routes (login, signup, etc.)
 * - Email verification routes
 */
export function shouldSkipAuthInit(pathname: string): boolean {
    // Skip on guest-only pages (login, signup, etc.)
    if (isGuestOnlyRoute(pathname)) return true;

    // Skip on verification pages
    if (pathname.startsWith('/verify-email')) return true;

    return false;
}

/**
 * Check if a path is an admin route
 */
export function isAdminRoute(pathname: string): boolean {
    return ADMIN_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Check if a path is a seller route
 */
export function isSellerRoute(pathname: string): boolean {
    return SELLER_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Check if a path should NOT trigger redirect to login on auth failure.
 * Used by API client interceptor.
 */
export function shouldNotRedirectOnAuthFailure(pathname: string): boolean {
    return isPublicRoute(pathname);
}
