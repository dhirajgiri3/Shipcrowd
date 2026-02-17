import { Request, Response } from 'express';
import { AUTH_COOKIES } from '../constants/security';

type AuthCookieNames = {
  accessCookieName: string;
  refreshCookieName: string;
  legacyAccessCookieNames: string[];
  legacyRefreshCookieNames: string[];
};

export const getAuthCookieNames = (): AuthCookieNames => {
  const isProd = process.env.NODE_ENV === 'production';

  return {
    accessCookieName: isProd ? AUTH_COOKIES.SECURE_ACCESS_TOKEN : AUTH_COOKIES.ACCESS_TOKEN,
    refreshCookieName: isProd ? AUTH_COOKIES.SECURE_REFRESH_TOKEN : AUTH_COOKIES.REFRESH_TOKEN,
    legacyAccessCookieNames: [AUTH_COOKIES.ACCESS_TOKEN, AUTH_COOKIES.SECURE_ACCESS_TOKEN],
    legacyRefreshCookieNames: [AUTH_COOKIES.REFRESH_TOKEN, AUTH_COOKIES.SECURE_REFRESH_TOKEN],
  };
};

// Helper function to get cookie options for auth tokens
// ✅ CRITICAL FIX: Never set domain for localhost - it breaks cookie persistence
// Browsers handle localhost specially; explicit domain prevents cookie setting/sending
export const getAuthCookieOptions = (maxAge: number) => {
  const isProd = process.env.NODE_ENV === 'production';

  // For development with ngrok/tunneling: sameSite=none + secure=true
  // This allows cookies to work through the Next.js proxy
  const isProxied = process.env.USE_PROXY_COOKIES === 'true';

  return {
    httpOnly: true,
    secure: isProd || isProxied, // Secure cookies for production OR when using proxy
    sameSite: (isProd ? 'strict' : (isProxied ? 'none' : 'lax')) as 'strict' | 'lax' | 'none',
    path: '/',
    // ✅ Domain must be undefined for localhost (browser auto-handles it)
    // Only set domain in production if needed for subdomain sharing
    maxAge,
  };
};

export const clearAuthCookies = (
  res: Response,
  opts: { includeLegacyDomain?: boolean } = {}
): void => {
  const { accessCookieName, refreshCookieName, legacyAccessCookieNames, legacyRefreshCookieNames } =
    getAuthCookieNames();
  const cookieOptions = getAuthCookieOptions(0);
  const includeLegacyDomain = opts.includeLegacyDomain ?? process.env.NODE_ENV === 'development';

  const clearNames = new Set<string>([
    accessCookieName,
    refreshCookieName,
    ...legacyAccessCookieNames,
    ...legacyRefreshCookieNames,
  ]);

  clearNames.forEach((name) => {
    res.clearCookie(name, cookieOptions);
    if (includeLegacyDomain) {
      res.clearCookie(name, { ...cookieOptions, domain: 'localhost' });
    }
  });
};

export const getRefreshTokenFromRequest = (req: Request): string | undefined => {
  const { refreshCookieName, legacyRefreshCookieNames } = getAuthCookieNames();

  return (
    req.cookies?.[refreshCookieName] ||
    legacyRefreshCookieNames.map((name) => req.cookies?.[name]).find(Boolean) ||
    req.body?.refreshToken
  );
};

export const getAccessTokenFromRequest = (req: Request): string | undefined => {
  const { accessCookieName, legacyAccessCookieNames } = getAuthCookieNames();

  const cookieToken =
    req.cookies?.[accessCookieName] ||
    legacyAccessCookieNames.map((name) => req.cookies?.[name]).find(Boolean) ||
    req.cookies?.impersonationToken;

  if (cookieToken) {
    return cookieToken;
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  if (req.query?.token) {
    return req.query.token as string;
  }

  return undefined;
};
