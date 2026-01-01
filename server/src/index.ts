/**
 * Server Entry Point
 * Starts the Express application and connects to database
 */
import dotenv from 'dotenv';
import app from './app';
import connectDB from './config/database';
import { initializeScheduler } from './config/scheduler';
import logger from './shared/logger/winston.logger';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5005;

/**
 * Start server
 */
const startServer = async (): Promise<void> => {
    try {
        // Connect to MongoDB
        await connectDB();
        logger.info('Database connected successfully');

        // Initialize Scheduler
        initializeScheduler();

        // Initialize NDR/RTO Background Jobs
        const { NDRResolutionJob } = await import('./infrastructure/jobs/NDRResolutionJob.js');
        await NDRResolutionJob.initialize();
        logger.info('NDR/RTO background jobs initialized');

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
