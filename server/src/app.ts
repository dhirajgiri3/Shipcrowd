import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Express, NextFunction, Request, Response } from 'express';
import morgan from 'morgan';

// Load environment variables
dotenv.config();

// Import configurations
import { configurePassport } from './config/passport';

// Import routes
import v1Routes from './presentation/http/routes/v1';

// Import middleware
import { securityHeaders } from './presentation/http/middleware/system/security-headers.middleware';
import { globalRateLimiter } from './shared/config/rateLimit.config';

// Import shared utilities
import { normalizeError } from './shared/errors/app.error';
import logger from './shared/logger/winston.logger';

// Initialize Express app
const app: Express = express();

// Trust proxy (for rate limiters behind reverse proxy)
app.set('trust proxy', 1);

// Apply compression middleware
app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    },
}));

// CORS configuration
const corsOptions = {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With', 'X-Skip-Refresh', 'X-API-Key', 'Accept', 'Origin'],
    maxAge: 86400,
};
app.use(cors(corsOptions));

// Apply global rate limiter
app.use(globalRateLimiter);

// Apply security headers
app.use(securityHeaders);

// Body parsing middleware with raw body capture for webhook signature verification
const jsonParser = express.json({
    limit: '10mb',
    verify: (req: any, _res, buf, _encoding) => {
        // Store raw body for webhook signature verification
        if (req.url.includes('/webhooks/') || req.url.includes('/commission/payouts/webhook')) {
            req.rawBody = buf;
        }

        // ✅ DEBUG: Log request body for JSON parsing issues
        if (process.env.NODE_ENV === 'development' && req.url.includes('/verify-email')) {
            logger.debug('verify-email - Raw buffer:', buf.toString());
            logger.debug('verify-email - Buffer length:', buf.length);
        }
    },
    // ✅ FIX: Strict JSON parsing with better error messages
    strict: true
});

app.use((req: Request, res: Response, next: NextFunction) => {
    // Shopify webhook routes need route-level express.raw() for byte-exact HMAC verification.
    if (req.path.startsWith('/api/v1/webhooks/shopify')) {
        next();
        return;
    }
    jsonParser(req, res, next);
});
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// HTTP request logging (only in non-test environments)
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined', {
        stream: {
            write: (message: string) => logger.info(message.trim()),
        },
    }));
}

// Configure Passport for OAuth
configurePassport(app);

// Serve static files from uploads directory (PDFs, documents)
const path = require('path');
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
    res.json({
        message: 'Welcome to Shipcrowd API',
        version: '1.0.0',
        documentation: '/api/v1/docs',
    });
});

// API routes
app.use('/api/v1', v1Routes);

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        message: 'Resource not found',
        path: req.path,
    });
});

// Global error handler
app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
    const normalizedError = normalizeError(error);

    logger.error('Error occurred:', {
        code: normalizedError.code,
        message: normalizedError.message,
        statusCode: normalizedError.statusCode,
        isOperational: normalizedError.isOperational,
        path: req.path,
        method: req.method,
        ...(normalizedError.details && { details: normalizedError.details }),
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
    });

    res.status(normalizedError.statusCode).json({
        success: false,
        error: {
            code: normalizedError.code,
            message: normalizedError.isOperational
                ? normalizedError.message
                : 'An unexpected error occurred. Please try again later.',
            ...(process.env.NODE_ENV !== 'production' && normalizedError.details && {
                details: normalizedError.details,
            }),
        },
        timestamp: new Date().toISOString(),
    });
});

export default app;
