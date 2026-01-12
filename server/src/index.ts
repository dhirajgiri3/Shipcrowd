/**
 * Server Entry Point
 * Starts the Express application and connects to database
 */
import dotenv from 'dotenv';
import app from './app';
import connectDB from './config/database';
import { initializeScheduler } from './config/scheduler';
import logger from './shared/logger/winston.logger';
import { NDRResolutionJob } from './infrastructure/jobs/logistics/shipping/ndr-resolution.job';
import { WeightDisputeJob } from './infrastructure/jobs/disputes/weight-dispute.job';
import { CODRemittanceJob } from './infrastructure/jobs/finance/cod-remittance.job';
import { initializeCommissionEventHandlers } from './shared/events/commissionEventHandlers';

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
        await NDRResolutionJob.initialize();
        logger.info('NDR/RTO background jobs initialized');

        // Initialize Weight Dispute Background Jobs
        await WeightDisputeJob.initialize();
        logger.info('Weight dispute background jobs initialized');

        // Initialize COD Remittance Background Jobs
        await CODRemittanceJob.initialize();
        logger.info('COD remittance background jobs initialized');

        // Initialize Commission System Event Handlers
        initializeCommissionEventHandlers();
        logger.info('Commission event handlers initialized');

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
