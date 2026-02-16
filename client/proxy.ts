import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isPublicRoute, isAdminRoute, isSellerRoute, isGuestOnlyRoute } from '@/src/config/routes';

/**
 * Next.js Proxy for Authentication and Route Protection
 * (Next.js 16+ uses proxy instead of middleware)
 *
 * This proxy runs before every request and checks authentication status.
 * It protects private routes and redirects unauthenticated users to login.
 */

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const decodeRoleFromToken = (token: string | undefined): string | null => {
        if (!token) return null;
        try {
            const parts = token.split('.');
            if (parts.length < 2) return null;
            const payload = JSON.parse(atob(parts[1]));
            return typeof payload?.role === 'string' ? payload.role : null;
        } catch {
            return null;
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // SET CSP HEADERS FOR SHOPIFY EMBEDDED APP
    // ═══════════════════════════════════════════════════════════════════════

    // Always set CSP headers to allow Shopify embedding
    const cspHeader = "frame-ancestors https://admin.shopify.com https://*.myshopify.com";

    // ═══════════════════════════════════════════════════════════════════════
    // CHECK AUTHENTICATION TOKENS
    // ═══════════════════════════════════════════════════════════════════════

    // Check both development and production cookie names
    const accessToken = request.cookies.get('accessToken');
    const refreshToken = request.cookies.get('refreshToken');

    // In production, backend uses __Secure- prefix
    const secureAccessToken = request.cookies.get('__Secure-accessToken');
    const secureRefreshToken = request.cookies.get('__Secure-refreshToken');

    const hasToken = !!(accessToken || refreshToken || secureAccessToken || secureRefreshToken);
    const effectiveAccessToken = accessToken?.value || secureAccessToken?.value;
    const roleFromToken = decodeRoleFromToken(effectiveAccessToken);

    const getDashboardPath = () => {
        if (roleFromToken === 'admin' || roleFromToken === 'super_admin') return '/admin';
        return '/seller';
    };

    // ═══════════════════════════════════════════════════════════════════════
    // GUEST-ONLY ROUTES - Redirect authenticated users
    // ═══════════════════════════════════════════════════════════════════════

    if (isGuestOnlyRoute(pathname)) {
        if (hasToken) {
            const response = NextResponse.redirect(new URL(getDashboardPath(), request.url));
            response.headers.set('Content-Security-Policy', cspHeader);
            return response;
        }
        const response = NextResponse.next();
        response.headers.set('Content-Security-Policy', cspHeader);
        return response;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PUBLIC ROUTES - Allow access without authentication
    // ═══════════════════════════════════════════════════════════════════════

    if (isPublicRoute(pathname)) {
        const response = NextResponse.next();
        response.headers.set('Content-Security-Policy', cspHeader);
        return response;
    }

    // Public metadata/assets that should never be auth-gated
    if (pathname === '/manifest.json' || pathname.endsWith('.webmanifest')) {
        const response = NextResponse.next();
        response.headers.set('Content-Security-Policy', cspHeader);
        return response;
    }



    // No tokens = redirect to login
    if (!hasToken) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);

        if (process.env.NODE_ENV === 'development') {
            console.log(`[Middleware] No auth tokens, redirecting to login: ${pathname}`);
        }

        const response = NextResponse.redirect(loginUrl);
        response.headers.set('Content-Security-Policy', cspHeader);
        return response;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ROLE-BASED ROUTE PROTECTION
    // ═══════════════════════════════════════════════════════════════════════

    // Admin routes - require admin role
    if (isAdminRoute(pathname)) {
        // Token exists but role check will happen in AuthGuard component
        // This is just a basic check - detailed validation happens client-side
        const response = NextResponse.next();
        response.headers.set('Content-Security-Policy', cspHeader);
        return response;
    }

    // Seller routes - require seller or admin role
    if (isSellerRoute(pathname)) {
        // Token exists - AuthGuard will validate role and company
        const response = NextResponse.next();
        response.headers.set('Content-Security-Policy', cspHeader);
        return response;
    }

    // Onboarding route - require authentication
    if (pathname.startsWith('/onboarding')) {
        const response = NextResponse.next();
        response.headers.set('Content-Security-Policy', cspHeader);
        return response;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DEFAULT - ALLOW ACCESS
    // ═══════════════════════════════════════════════════════════════════════

    const response = NextResponse.next();
    response.headers.set('Content-Security-Policy', cspHeader);
    return response;
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
        '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|.*\\.webmanifest|public|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
    ],
};
