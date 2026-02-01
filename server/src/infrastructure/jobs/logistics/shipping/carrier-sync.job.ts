/**
 * Carrier Sync Job
 *
 * Background job for retrying failed carrier API calls (e.g. initial shipment creation).
 */

import { Job } from 'bullmq';
import { ShipmentService } from '../../../../core/application/services/shipping/shipment.service';
import QueueManager from '../../../utilities/queue-manager';
import logger from '../../../../shared/logger/winston.logger';

interface CarrierSyncJobData {
    shipmentId: string;
}

export class CarrierSyncJob {
    private static readonly QUEUE_NAME = 'carrier-sync';

    /**
     * Initialize the job worker
     */
    static async initialize(): Promise<void> {
        await QueueManager.registerWorker({
            queueName: this.QUEUE_NAME,
            processor: this.processJob.bind(this),
            concurrency: 5,
        });

        logger.info('Carrier Sync worker initialized');
    }

    /**
     * Process job
     */
    private static async processJob(job: Job<CarrierSyncJobData>): Promise<any> {
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
