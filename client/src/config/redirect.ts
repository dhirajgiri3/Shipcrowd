/**
 * Centralized redirect utilities for post-login and role-based navigation.
 * Single source of truth for default destinations and safe redirect validation.
 * Aligns with RBAC: .cursor/rules/auth-rbac-v5.mdc
 */


/** User shape used for redirect decisions (role + company) */
export interface UserForRedirect {
    role: string;
    companyId?: string | null;
}

/** Allowed post-login redirect path prefixes (internal app only) */
const ALLOWED_REDIRECT_PREFIXES = ['/admin', '/seller', '/onboarding'] as const;

/**
 * Returns the default destination after login based on role and company.
 * - super_admin / admin → /admin (platform dashboard)
 * - seller / staff with companyId → /seller
 * - seller / staff without companyId → /onboarding (company setup)
 */
export function getDefaultRedirectForUser(user: UserForRedirect | null | undefined): string {
    if (!user) return '/login';

    const role = user.role;
    const hasCompany = Boolean(user.companyId);

    if (role === 'super_admin' || role === 'admin') {
        return '/admin';
    }
    if (role === 'seller' || role === 'staff') {
        return hasCompany ? '/seller' : '/onboarding';
    }

    return '/seller';
}

/**
 * Validates that a redirect URL is safe (same-origin, allowed path).
 * Prevents open redirect: only /admin, /seller, /onboarding (and subpaths) are allowed.
 */
export function isAllowedRedirectPath(path: string): boolean {
    if (!path || typeof path !== 'string') return false;
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return ALLOWED_REDIRECT_PREFIXES.some(
        (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
    );
}

/**
 * Resolves post-login redirect: uses callbackUrl/redirect param if safe, else default by role.
 * Use after login, OAuth callback, magic link, etc.
 */
export function getLoginRedirect(
    user: UserForRedirect | null | undefined,
    searchParams: URLSearchParams | null
): string {
    const callbackUrl = searchParams?.get('callbackUrl') ?? searchParams?.get('redirect');
    if (callbackUrl && isAllowedRedirectPath(callbackUrl)) {
        return callbackUrl.startsWith('/') ? callbackUrl : `/${callbackUrl}`;
    }
    return getDefaultRedirectForUser(user);
}

/**
 * Whether the current path matches the user's default dashboard (for nav highlighting etc.).
 */
export function isDefaultDashboardPath(user: UserForRedirect | null | undefined, pathname: string): boolean {
    const defaultPath = getDefaultRedirectForUser(user);
    return pathname === defaultPath || pathname.startsWith(`${defaultPath}/`);
}
