/**
 * OAuth Configuration
 * Centralized configuration for OAuth providers
 * 
 * SECURITY: Validates API URL in production to prevent deployment failures
 */

// Validate API URL is set in production
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
    if (!process.env.NEXT_PUBLIC_API_URL) {
        throw new Error(
            'NEXT_PUBLIC_API_URL must be set in production environment. ' +
            'Please configure it in your deployment settings.'
        );
    }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api/v1';

/**
 * OAuth Provider Configuration
 */
export const OAUTH_CONFIG = {
    google: {
        /**
         * Google OAuth authorization URL
         * Redirects user to Google for authentication
         */
        authUrl: `${API_URL}/auth/google`,

        /**
         * OAuth callback URL (frontend route)
         * Google redirects here after authentication
         */
        callbackUrl: '/oauth-callback',

        /**
         * Display name for UI
         */
        displayName: 'Google',
    },

    // Future OAuth providers can be added here
    // microsoft: { ... },
    // apple: { ... },
    // github: { ... },
} as const;

/**
 * Get OAuth authorization URL for a provider
 * @param provider - OAuth provider name
 * @returns Full authorization URL
 */
export function getOAuthUrl(provider: keyof typeof OAUTH_CONFIG): string {
    const config = OAUTH_CONFIG[provider];
    if (!config) {
        throw new Error(`Unknown OAuth provider: ${provider}`);
    }
    return config.authUrl;
}

/**
 * Type-safe OAuth provider names
 */
export type OAuthProvider = keyof typeof OAUTH_CONFIG;
