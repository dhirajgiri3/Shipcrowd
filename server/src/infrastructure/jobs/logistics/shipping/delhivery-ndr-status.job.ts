/**
 * Delhivery NDR Status Polling Job
 */

import { Job } from 'bullmq';
import mongoose from 'mongoose';
import QueueManager from '../../../utilities/queue-manager';
import logger from '../../../../shared/logger/winston.logger';
import { NDREvent } from '../../../database/mongoose/models';
import { CourierFactory } from '../../../../core/application/services/courier/courier.factory';

interface DelhiveryNdrJobData {
    uplId: string;
    awb: string;
    ndrEventId: string;
}

export class DelhiveryNdrStatusJob {
    private static readonly QUEUE_NAME = 'delhivery-ndr-status';

    static async initialize(): Promise<void> {
        await QueueManager.registerWorker({
            queueName: this.QUEUE_NAME,
            processor: this.processJob.bind(this),
            concurrency: 3
        });

        logger.info('Delhivery NDR status worker initialized');
    }

    private static isTerminal(status?: string): boolean {
        if (!status) return false;
        const normalized = status.toLowerCase();
        return normalized.includes('delivered') || normalized.includes('rto') || normalized.includes('cancel');
    }

    private static async processJob(job: Job<DelhiveryNdrJobData>): Promise<any> {
        const { uplId, awb, ndrEventId } = job.data;

        try {
            const ndrEvent = await NDREvent.findById(ndrEventId);
            if (!ndrEvent) {
                logger.warn('NDR event not found for Delhivery poll', { ndrEventId });
                return { success: false, reason: 'NDR not found' };
            }

            // TTL: stop after 48 hours
            const ttlMs = 48 * 60 * 60 * 1000;
            if (Date.now() - ndrEvent.detectedAt.getTime() > ttlMs) {
                logger.info('Delhivery NDR polling TTL exceeded', { ndrEventId, uplId });
                return { success: false, reason: 'TTL exceeded' };
            }

            const provider = await CourierFactory.getProvider(
                'delhivery',
                new mongoose.Types.ObjectId(ndrEvent.company)
            );

            // FALLBACK LOGIC:
            // If the NDR event was updated by a webhook recently (e.g., < 1 hour), 
            // skip polling to avoid unnecessary API calls and race conditions.
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            if (ndrEvent.updatedAt > oneHourAgo) {
                logger.debug('Skipping Delhivery poll (recently updated)', { ndrEventId, awb });
                return { success: true, status: 'skipped_recent_update' };
            }

            const response = await (provider as any).getNdrStatus(uplId);
            const status = response?.status || response?.results?.status || response?.message;

            ndrEvent.resolutionActions.push({
                action: 'Delhivery NDR status polled',
                actionType: 'manual',
                takenAt: new Date(),
                takenBy: 'system',
                result: 'success',
                metadata: { uplId, status, raw: response }
            });

            await ndrEvent.save();

            if (this.isTerminal(status)) {
                logger.info('Delhivery NDR polling reached terminal state', { ndrEventId, status });
                return { success: true, terminal: true, status };
            }

            return { success: true, status };
        } catch (error: any) {
            logger.error('Delhivery NDR status polling failed', {
                uplId,
                error: error.message || error
            });
            throw error;
        }
    }
}

export default DelhiveryNdrStatusJob;
