import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

// Load environment variables before other imports
dotenv.config();

// Import configurations
import connectDB from './config/database';
import { configurePassport } from './config/passport';

// Import routes
import v1Routes from './presentation/http/routes/v1';

// Import middleware
import { securityHeaders } from './presentation/http/middleware/securityHeaders';
import { globalRateLimiter } from './presentation/http/middleware/rateLimiter';

// Import shared utilities
import logger from './shared/logger/winston.logger';

// Initialize Express app
const app: Express = express();
const PORT = process.env.PORT || 5005;

// Trust proxy (for rate limiters behind reverse proxy)
app.set('trust proxy', 1);

// Apply global rate limiter
app.use(globalRateLimiter);

// Apply security headers
app.use(securityHeaders);

// CORS configuration
const corsOptions = {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// HTTP request logging
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
    logger.error('Unhandled error:', {
        message: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
    });

    res.status(500).json({
        message: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : error.message,
    });
});

// Start server
const startServer = async (): Promise<void> => {
    try {
        // Connect to MongoDB
        await connectDB();
        logger.info('Database connected successfully');

        // Start listening
        app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
            logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`API available at http://localhost:${PORT}/api/v1`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
    logger.error('Unhandled Rejection:', reason);
    process.exit(1);
});

// Start the server
startServer();

export default app;
