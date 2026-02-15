/**
 * Carrier Sync Job
 *
 * Background job for retrying failed carrier API calls (e.g. initial shipment creation).
 */

import { Job } from 'bullmq';
import { ShipmentService } from '../../../../core/application/services/shipping/shipment.service';
import logger from '../../../../shared/logger/winston.logger';
import { Shipment } from '../../../database/mongoose/models';
import QueueManager from '../../../utilities/queue-manager';

interface CarrierSyncJobData {
    shipmentId?: string;
}

export class CarrierSyncJob {
    private static readonly QUEUE_NAME = 'carrier-sync';
    private static readonly SWEEP_JOB_NAME = 'sweep-pending';
    private static readonly SYNC_JOB_NAME = 'sync-shipment';
    private static readonly SWEEP_CRON = process.env.CARRIER_SYNC_SWEEP_CRON || '*/5 * * * *';
    private static readonly SWEEP_LIMIT = Number(process.env.CARRIER_SYNC_SWEEP_LIMIT || 200);
    private static readonly MAX_RETRIES = Number(process.env.CARRIER_SYNC_MAX_RETRIES || 5);

    /**
     * Initialize the job worker
     */
    static async initialize(): Promise<void> {
        await QueueManager.registerWorker({
            queueName: this.QUEUE_NAME,
            processor: this.processJob.bind(this),
            concurrency: 5,
        });

        const queue = QueueManager.getQueue(this.QUEUE_NAME);
        let hasSweepJob = false;
        if (queue) {
            const repeatableJobs = await queue.getRepeatableJobs();
            hasSweepJob = repeatableJobs.some(
                (job) => job.name === this.SWEEP_JOB_NAME && job.pattern === this.SWEEP_CRON
            );
        }

        if (!hasSweepJob) {
            await QueueManager.addRepeatableJob(
                this.QUEUE_NAME,
                this.SWEEP_JOB_NAME,
                {},
                this.SWEEP_CRON
            );
        }

        logger.info('Carrier Sync worker initialized');
    }

    private static async enqueueAwaitingShipments(): Promise<number> {
        const pendingShipments = await Shipment.find({
            currentStatus: 'awaiting_carrier_sync',
            isDeleted: false,
            $and: [
                {
                    $or: [
                        { 'carrierDetails.retryCount': { $exists: false } },
                        { 'carrierDetails.retryCount': { $lt: this.MAX_RETRIES } },
                    ],
                },
                {
                    $or: [
                        { 'carrierDetails.carrierTrackingNumber': { $exists: false } },
                        { 'carrierDetails.carrierTrackingNumber': null },
                        { 'carrierDetails.carrierTrackingNumber': '' },
                    ],
                },
            ],
        })
            .select('_id carrierDetails.retryCount')
            .sort({ updatedAt: 1 })
            .limit(this.SWEEP_LIMIT)
            .lean();

        let queuedCount = 0;

        for (const shipment of pendingShipments) {
            const shipmentId = String(shipment._id);
            const jobId = `${this.SYNC_JOB_NAME}-${shipmentId}`;

            try {
                await QueueManager.addJob(
                    this.QUEUE_NAME,
                    this.SYNC_JOB_NAME,
                    { shipmentId },
                    {
                        jobId,
                        attempts: 5,
                        backoff: { type: 'exponential', delay: 30000 },
                        removeOnComplete: true,
                    }
                );
                queuedCount += 1;
            } catch (error: any) {
                const message = String(error?.message || '');
                if (message.includes('Job') && message.includes('already exists')) {
                    continue;
                }
                logger.warn(`Failed to enqueue awaiting carrier sync shipment: ${message}`, {
                    shipmentId,
                    code: error?.code,
                    name: error?.name,
                });
            }
        }

        return queuedCount;
    }

    /**
     * Process job
     */
    private static async processJob(job: Job<CarrierSyncJobData>): Promise<any> {
        if (job.name === this.SWEEP_JOB_NAME) {
            const queuedCount = await this.enqueueAwaitingShipments();
            logger.info('Carrier sync sweep completed', {
                queuedCount,
                sweepLimit: this.SWEEP_LIMIT,
            });
            return { queuedCount };
        }

        const { shipmentId } = job.data;
        const { id: jobId } = job;

        logger.info('Processing carrier sync job', {
            jobId,
            shipmentId
        });

        try {
            if (!shipmentId) {
                throw new Error('Missing shipmentId in job data');
            }

            const success = await ShipmentService.retryShipmentCreation(shipmentId);

            if (success) {
                logger.info(`Carrier sync successful for shipment ${shipmentId}`);
            } else {
                logger.info(`Carrier sync skipped or failed for shipment ${shipmentId}`);
            }

            return { success, shipmentId };
        } catch (error: any) {
            logger.error('Carrier sync job failed', {
                jobId,
                shipmentId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
}

export default CarrierSyncJob;
