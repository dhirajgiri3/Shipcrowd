/**
 * Server Entry Point
 * Starts the Express application and connects to database
 */
import dotenv from 'dotenv';
import app from './app';
import connectDB from './config/database';
import { initializeScheduler } from './config/scheduler';
import logger from './shared/logger/winston.logger';
import QueueManager from './infrastructure/utilities/queue-manager';
import { NDRResolutionJob } from './infrastructure/jobs/logistics/shipping/ndr-resolution.job';
import { WeightDisputeJob } from './infrastructure/jobs/disputes/weight-dispute.job';
import { CODRemittanceJob } from './infrastructure/jobs/finance/cod-remittance.job';
import { DisputeSLAJob } from './infrastructure/jobs/logistics/dispute-sla.job';
import { initializeCommissionEventHandlers } from './shared/events/commissionEventHandlers';
import PincodeLookupService from './core/application/services/logistics/pincode-lookup.service';

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

        // Load Pincode Cache from CSV (in-memory for fast lookups)
        await PincodeLookupService.loadPincodesFromCSV();
        logger.info('Pincode cache loaded successfully');

        // Initialize Queue Manager FIRST (creates all queues)
        await QueueManager.initialize();
        logger.info('Queue Manager initialized');

        // Initialize Background Job Workers (registers workers for existing queues)
        // This prevents race conditions where cron jobs try to queue to unregistered queues

        // Initialize NDR/RTO Background Jobs
        await NDRResolutionJob.initialize();
        logger.info('NDR/RTO background jobs initialized');

        // Initialize Weight Dispute Background Jobs
        await WeightDisputeJob.initialize();
        logger.info('Weight dispute background jobs initialized');

        // Initialize COD Remittance Background Jobs
        await CODRemittanceJob.initialize();
        logger.info('COD remittance background jobs initialized');

        // Initialize General Dispute SLA Management Job
        DisputeSLAJob.initialize();
        logger.info('Dispute SLA management job initialized');

        // NOW Initialize Scheduler (after all workers are registered)
        initializeScheduler();

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
