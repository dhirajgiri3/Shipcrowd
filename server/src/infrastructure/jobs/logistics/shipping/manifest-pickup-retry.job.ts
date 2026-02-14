/**
 * Manifest Pickup Retry Job
 *
 * Background job for retrying failed carrier pickup scheduling during manifest closure.
 */

import { Job } from 'bullmq';
import { CourierFactory } from '../../../../core/application/services/courier/courier.factory';
import QueueManager from '../../../utilities/queue-manager';
import logger from '../../../../shared/logger/winston.logger';
import Manifest from '../../../database/mongoose/models/logistics/shipping/manifest.model';

interface ManifestPickupRetryJobData {
    manifestId: string;
    shipmentId: string;
    carrier: string;
    providerShipmentId: string;
}

export class ManifestPickupRetryJob {
    private static readonly QUEUE_NAME = 'manifest-pickup-retry';

    /**
     * Initialize the job worker
     */
    static async initialize(): Promise<void> {
        await QueueManager.registerWorker({
            queueName: this.QUEUE_NAME,
            processor: this.processJob.bind(this),
            concurrency: 5,
        });

        logger.info('Manifest Pickup Retry worker initialized');
    }

    /**
     * Process job
     */
    private static async processJob(job: Job<ManifestPickupRetryJobData>): Promise<any> {
        const { manifestId, shipmentId, carrier, providerShipmentId } = job.data;
        const { id: jobId } = job;

        logger.info('Processing manifest pickup retry job', {
            jobId,
            manifestId,
            shipmentId,
            carrier
        });

        try {
            if (!manifestId || !shipmentId || !carrier) {
                throw new Error('Missing required job data (manifestId, shipmentId, or carrier)');
            }

            // Verify manifest still exists and get companyId
            const manifest = await Manifest.findById(manifestId);
            if (!manifest) {
                logger.warn('Manifest not found during pickup retry, aborting', { manifestId });
                return { success: false, reason: 'Manifest not found' };
            }

            // Get provider (resolve service types like "surface" to velocity)
            const { CarrierNormalizationService } = await import('../../../core/application/services/shipping/carrier-normalization.service');
            const { default: CourierProviderRegistry } = await import('../../../core/application/services/courier/courier-provider-registry');
            const providerCarrier = CarrierNormalizationService.resolveCarrierForProviderLookup(carrier)
                || CourierProviderRegistry.getIntegrationProvider(carrier)
                || carrier;

            const provider = await CourierFactory.getProvider(providerCarrier, manifest.companyId);

            if (!provider.schedulePickup) {
                logger.warn('Provider does not support pickup scheduling', { carrier });
                return { success: false, reason: 'Provider does not support pickup scheduling' };
            }

            // Retry scheduling pickup
            if (providerShipmentId) {
                await provider.schedulePickup({
                    providerShipmentId
                });

                logger.info('Pickup scheduled successfully on retry', {
                    jobId,
                    shipmentId,
                    carrier
                });

                return { success: true, shipmentId };
            } else {
                throw new Error('Missing providerShipmentId in job data');
            }

        } catch (error: any) {
            logger.error('Manifest pickup retry job failed', {
                jobId,
                shipmentId,
                error: error.message,
                stack: error.stack
            });
            throw error; // Throwing allows BullMQ to handle retries based on backoff config
        }
    }
}

export default ManifestPickupRetryJob;
