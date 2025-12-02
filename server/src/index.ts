import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import connectDB from './config/database';
import logger, { stream, addCorrelationId, getRequestLogger } from './utils/logger';
import { auditLogMiddleware } from './middleware';
import { configurePassport } from './config/passport';
import { initializeScheduler } from './config/scheduler';
import { globalRateLimiter } from './middleware/rateLimiter';
import { securityHeaders } from './middleware/securityHeaders';
import routes from './routes';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5005;

// Configure Passport
configurePassport(app);

// Apply security headers
app.use(securityHeaders);

// Configure CORS with specific options
const corsOptions: cors.CorsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.CLIENT_URL || 'http://localhost:3000']
    : true, // In non-production, allow all origins for easier testing
  credentials: true, // Allow cookies to be sent with requests
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'Origin', 'Accept'],
};

app.use(cors(corsOptions)); // Enable CORS with options
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies

// Add correlation ID to requests
app.use(addCorrelationId);

// Add request logger to each request
app.use((req, _res, next) => {
  req.requestLogger = getRequestLogger(req);
  next();
});

// HTTP request logging (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream }));
}

// Apply global rate limiting
app.use(globalRateLimiter);

// Audit logging (only for authenticated routes)
// This will be applied to routes that have authentication middleware
app.use('/api', (req, res, next) => auditLogMiddleware(req as any, res, next));

// Basic routes
app.get('/', (req, res) => {
  req.requestLogger?.info('Home route accessed');
  res.json({ message: 'Welcome to Shipcrowd API' });
});

// API routes
app.use('/api', routes);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  req.requestLogger?.error('Unhandled error', { error: err.message, stack: err.stack });

  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
});

// Initialize scheduler for background jobs
initializeScheduler();

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Give the logger time to log the error before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

export default app;
