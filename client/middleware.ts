/**
 * Next.js Middleware - Route Protection
 * 
 * Runs on EVERY request before page renders.
 * Handles authentication-based routing and redirects.
 * 
 * This middleware:
 * 1. Checks authentication status via session cookie
 * 2. Protects /seller/* and /admin/* routes
 * 3. Redirects authenticated users away from guest-only pages (login/signup)
 * 4. Allows public routes for everyone
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
    isPublicRoute,
    isGuestOnlyRoute,
    isAdminRoute,
    isSellerRoute,
} from './src/config/routes';

/**
 * Extract user authentication status from cookies
 * Returns: { isAuthenticated: boolean, role?: string }
 */
function getAuthStatusFromCookies(request: NextRequest): {
    isAuthenticated: boolean;
    role?: string;
    userId?: string;
} {
    // Backend sets these cookies on successful authentication
    const accessToken = request.cookies.get('accessToken');
    const refreshToken = request.cookies.get('refreshToken');

    // If no tokens, user is not authenticated
    if (!accessToken && !refreshToken) {
        return { isAuthenticated: false };
    }

    // Extract user role from cookie (backend sets this)
    const userRole = request.cookies.get('userRole')?.value;
    const userId = request.cookies.get('userId')?.value;

    return {
        isAuthenticated: true,
        role: userRole,
        userId,
    };
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const auth = getAuthStatusFromCookies(request);

    // ═══════════════════════════════════════════════════════════════
    // 1. Skip middleware for static files, API routes, and _next
    // ═══════════════════════════════════════════════════════════════
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/static') ||
        pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf)$/)
    ) {
        return NextResponse.next();
    }

    // ═══════════════════════════════════════════════════════════════
    // 2. PUBLIC ROUTES - Allow everyone
    // ═══════════════════════════════════════════════════════════════
    if (isPublicRoute(pathname)) {
        // Guest-only routes: if authenticated, redirect to dashboard
        if (isGuestOnlyRoute(pathname) && auth.isAuthenticated) {
            const dashboardUrl = auth.role === 'admin' ? '/admin' : '/seller';
            return NextResponse.redirect(new URL(dashboardUrl, request.url));
        }

        // Public routes - allow
        return NextResponse.next();
    }

    // ═══════════════════════════════════════════════════════════════
    // 3. PROTECTED ROUTES - Require authentication
    // ═══════════════════════════════════════════════════════════════

    // Not authenticated - redirect to login
    if (!auth.isAuthenticated) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // ═══════════════════════════════════════════════════════════════
    // 4. ROLE-BASED ACCESS CONTROL
    // ═══════════════════════════════════════════════════════════════

    // Admin routes
    if (isAdminRoute(pathname)) {
        if (auth.role !== 'admin') {
            // Non-admin trying to access admin route
            return NextResponse.redirect(new URL('/seller', request.url));
        }
    }

    // Seller routes
    if (isSellerRoute(pathname)) {
        if (auth.role !== 'seller' && auth.role !== 'admin') {
            // Invalid role for seller routes
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 5. Add security headers
    // ═══════════════════════════════════════════════════════════════
    const response = NextResponse.next();

    // Add security headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // CSP for production
    if (process.env.NODE_ENV === 'production') {
        response.headers.set(
            'Content-Security-Policy',
            "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
        );
    }

    return response;
}

/**
 * Matcher configuration
 * Defines which routes this middleware runs on
 */
export const config = {
    matcher: [
        /*
         * Match all paths except:
         * - /api (API routes)
         * - /_next/static (static files)
         * - /_next/image (image optimization)
         * - /favicon.ico, /sitemap.xml, /robots.txt (meta files)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
    ],
};
