import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isPublicRoute, isAdminRoute, isSellerRoute } from '@/src/config/routes';

/**
 * Next.js Middleware for Authentication and Route Protection
 *
 * This middleware runs before every request and checks authentication status.
 * It protects private routes and redirects unauthenticated users to login.
 */

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // ═══════════════════════════════════════════════════════════════════════
    // PUBLIC ROUTES - Allow access without authentication
    // ═══════════════════════════════════════════════════════════════════════

    if (isPublicRoute(pathname)) {
        return NextResponse.next();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CHECK AUTHENTICATION TOKENS
    // ═══════════════════════════════════════════════════════════════════════

    const accessToken = request.cookies.get('accessToken');
    const refreshToken = request.cookies.get('refreshToken');

    // No tokens = redirect to login
    if (!accessToken && !refreshToken) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);

        if (process.env.NODE_ENV === 'development') {
            console.log(`[Middleware] No auth tokens, redirecting to login: ${pathname}`);
        }

        return NextResponse.redirect(loginUrl);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ROLE-BASED ROUTE PROTECTION
    // ═══════════════════════════════════════════════════════════════════════

    // Admin routes - require admin role
    if (isAdminRoute(pathname)) {
        // Token exists but role check will happen in AuthGuard component
        // This is just a basic check - detailed validation happens client-side
        return NextResponse.next();
    }

    // Seller routes - require seller or admin role
    if (isSellerRoute(pathname)) {
        // Token exists - AuthGuard will validate role and company
        return NextResponse.next();
    }

    // Onboarding route - require authentication
    if (pathname.startsWith('/onboarding')) {
        return NextResponse.next();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DEFAULT - ALLOW ACCESS
    // ═══════════════════════════════════════════════════════════════════════

    return NextResponse.next();
}

/**
 * Middleware Configuration
 *
 * Specifies which routes the middleware should run on.
 * Excludes:
 * - API routes (/api/*)
 * - Static files (_next/static/*)
 * - Image optimization (_next/image/*)
 * - Favicon and public assets
 */
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder files
         */
        '/((?!api|_next/static|_next/image|favicon.ico|public|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
    ],
};
