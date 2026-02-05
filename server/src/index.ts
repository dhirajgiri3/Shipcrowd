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
import { CarrierSyncJob } from './infrastructure/jobs/logistics/shipping/carrier-sync.job';
import { ManifestPickupRetryJob } from './infrastructure/jobs/logistics/shipping/manifest-pickup-retry.job';
import LostShipmentDetectionJob from './infrastructure/jobs/logistics/shipping/lost-shipment-detection.job';
import { WarehouseSyncJob } from './infrastructure/jobs/logistics/warehouse-sync.job';

import { initializeCommissionEventHandlers } from './shared/events/commissionEventHandlers';
import { initializeCRMListeners } from './core/application/listeners/crm/index';
import PincodeLookupService from './core/application/services/logistics/pincode-lookup.service';
import CacheService from './infrastructure/utilities/cache.service';
import { initializeRateLimitRedis } from './shared/config/rateLimit.config';
import { PubSubService } from './infrastructure/redis/pubsub.service';

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

        // Initialize Cache Service (Redis or Memory)
        await CacheService.initialize();

        // Initialize Rate Limiter Redis Client (BEFORE routes are loaded)
        await initializeRateLimitRedis();

        // Initialize PubSub for distributed cache invalidation
        await PubSubService.initialize();
        logger.info('PubSub service initialized');

        // Initialize Courier Status Mapper (register all courier status mappings)
        const { StatusMapperService } = await import('./core/application/services/courier/status-mappings/status-mapper.service');
        const { VELOCITY_STATUS_MAPPINGS, DELHIVERY_STATUS_MAPPINGS, EKART_STATUS_MAPPINGS } = await import('./core/application/services/courier/status-mappings/index');

        StatusMapperService.register(VELOCITY_STATUS_MAPPINGS);
        StatusMapperService.register(DELHIVERY_STATUS_MAPPINGS);
        StatusMapperService.register(EKART_STATUS_MAPPINGS);
        logger.info('Courier status mappings registered', {
            couriers: StatusMapperService.getRegisteredCouriers()
        });

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


        // Initialize Carrier Sync Retry Job
        await CarrierSyncJob.initialize();
        await WarehouseSyncJob.initialize();
        const { DelhiveryNdrStatusJob } = await import('./infrastructure/jobs/logistics/shipping/delhivery-ndr-status.job');
        await DelhiveryNdrStatusJob.initialize();
        logger.info('Carrier sync retry job initialized');

        // Initialize Manifest Pickup Retry Job
        await ManifestPickupRetryJob.initialize();
        logger.info('Manifest pickup retry job initialized');

        // Initialize Lost Shipment Detection Job
        await LostShipmentDetectionJob.initialize();
        logger.info('Lost shipment detection job initialized');

        // NOW Initialize Scheduler (after all workers are registered)
        initializeScheduler();

        // Initialize Commission System Event Handlers
        initializeCommissionEventHandlers();
        logger.info('Commission event handlers initialized');

        // Initialize CRM Event Handlers (NDR, etc.)
        initializeCRMListeners();
        logger.info('CRM event handlers initialized');

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
