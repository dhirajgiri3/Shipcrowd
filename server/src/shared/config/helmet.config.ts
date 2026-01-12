import helmet from 'helmet';
import { Express } from 'express';

/**
 * Configure Helmet Security Headers
 * 
 * Helmet helps secure Express apps by setting various HTTP headers
 * https://helmetjs.github.io/
 */
export const configureHelmet = (app: Express) => {
    app.use(
        helmet({
            // Content Security Policy
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for API docs
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", 'data:', 'https:'],
                    connectSrc: ["'self'"],
                    fontSrc: ["'self'"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"],
                },
            },

            // HTTP Strict Transport Security (HSTS)
            // Forces HTTPS for 1 year
            hsts: {
                maxAge: 31536000, // 1 year in seconds
                includeSubDomains: true,
                preload: true,
            },

            // X-Frame-Options
            // Prevents clickjacking attacks
            frameguard: {
                action: 'deny',
            },

            // X-Content-Type-Options
            // Prevents MIME type sniffing
            noSniff: true,

            // X-XSS-Protection
            // Enables XSS filter in older browsers
            xssFilter: true,

            // Referrer-Policy
            // Controls referrer information
            referrerPolicy: {
                policy: 'strict-origin-when-cross-origin',
            },

            // Permissions-Policy (formerly Feature-Policy)
            // Controls which browser features can be used
            permittedCrossDomainPolicies: {
                permittedPolicies: 'none',
            },

            // X-DNS-Prefetch-Control
            // Controls DNS prefetching
            dnsPrefetchControl: {
                allow: false,
            },

            // X-Download-Options
            // Prevents IE from executing downloads in site's context
            ieNoOpen: true,

            // X-Powered-By
            // Removes X-Powered-By header (hides Express)
            hidePoweredBy: true,
        })
    );

    // Log security headers configuration
    console.log('✅ Security headers configured (Helmet)');
};

/**
 * Development-friendly Helmet configuration
 * Less strict for local development
 */
export const configureHelmetDev = (app: Express) => {
    app.use(
        helmet({
            contentSecurityPolicy: false, // Disable CSP in dev for easier debugging
            hsts: false, // No HSTS in dev (not using HTTPS locally)
        })
    );

    console.log('✅ Security headers configured (Helmet - Dev Mode)');
};
