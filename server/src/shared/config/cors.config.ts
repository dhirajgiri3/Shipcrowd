import cors, { CorsOptions } from 'cors';
import { Express } from 'express';

/**
 * CORS Configuration
 * 
 * Controls which origins can access the API
 * Configured based on environment (development/production)
 */

/**
 * Get allowed origins based on environment
 */
const getAllowedOrigins = (): string[] => {
    const env = process.env.NODE_ENV || 'development';

    if (env === 'development') {
        // Allow localhost in development
        return [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:5173', // Vite default
            'http://127.0.0.1:3000',
        ];
    }

    // Production origins from environment variable
    const origins = process.env.ALLOWED_ORIGINS?.split(',') || [];

    if (origins.length === 0) {
        console.warn('⚠️  No ALLOWED_ORIGINS configured for production!');
    }

    return origins;
};

/**
 * CORS options configuration
 */
const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = getAllowedOrigins();

        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`❌ CORS blocked request from origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },

    // Allow credentials (cookies, authorization headers)
    credentials: true,

    // Allowed methods
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    // Allowed headers
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-API-Key',
        'Accept',
        'Origin',
    ],

    // Exposed headers (accessible to client)
    exposedHeaders: [
        'X-Total-Count',
        'X-Page',
        'X-Per-Page',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
    ],

    // Preflight cache duration (in seconds)
    maxAge: 86400, // 24 hours

    // Success status for OPTIONS requests
    optionsSuccessStatus: 204,
};

/**
 * Configure CORS middleware
 */
export const configureCORS = (app: Express) => {
    app.use(cors(corsOptions));

    const allowedOrigins = getAllowedOrigins();
    console.log('✅ CORS configured');
    console.log(`   Allowed origins: ${allowedOrigins.join(', ')}`);
};

/**
 * Permissive CORS for development
 * Allows all origins
 */
export const configureCORSDev = (app: Express) => {
    app.use(
        cors({
            origin: true, // Allow all origins
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        })
    );

    console.log('✅ CORS configured (Development - All origins allowed)');
};
