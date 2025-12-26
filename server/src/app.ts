import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import compression from 'compression';

// Load environment variables
dotenv.config();

// Import configurations
import { configurePassport } from './config/passport';

// Import routes
import v1Routes from './presentation/http/routes/v1';

// Import middleware
import { securityHeaders } from './presentation/http/middleware/system/securityHeaders';
import { globalRateLimiter } from './presentation/http/middleware/system/rateLimiter';

// Import shared utilities
import logger from './shared/logger/winston.logger';
import { AppError, normalizeError } from './shared/errors/AppError';

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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
    maxAge: 86400,
};
app.use(cors(corsOptions));

// Apply global rate limiter
app.use(globalRateLimiter);

// Apply security headers
app.use(securityHeaders);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
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

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
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
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
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
