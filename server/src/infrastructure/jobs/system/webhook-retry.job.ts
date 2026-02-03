/**
 * Webhook Replay Job
 * 
 * Provides manual replay capability for failed webhooks.
 * Does NOT auto-retry - Velocity handles automatic retries.
 * This is only for manual intervention when needed.
 */

import { Job } from 'bullmq';
import { WebhookRetryService } from '@/core/application/services/system/webhook-retry.service';
import { VelocityWebhookService } from '@/core/application/services/webhooks/velocity-webhook.service';
import QueueManager from '@/infrastructure/utilities/queue-manager';
import logger from '@/shared/logger/winston.logger';

interface WebhookReplayJobData {
    webhookId: string; // ID of FailedWebhook to replay
}

export class WebhookReplayJob {
    private static readonly QUEUE_NAME = 'webhook-replay';

    /**
     * Initialize worker
     */
    static async initialize(): Promise<void> {
        await QueueManager.registerWorker({
            queueName: this.QUEUE_NAME,
            processor: this.processJob.bind(this),
            concurrency: 1,
        });

        logger.info('Webhook replay worker initialized');
    }

    /**
     * Process manual replay job
     */
    private static async processJob(job: Job<WebhookReplayJobData>): Promise<any> {
        const { webhookId } = job.data;

        try {
            const webhook = await WebhookRetryService.getWebhookById(webhookId);

            if (!webhook) {
                return { success: false, error: 'Webhook not found' };
            }

            if (webhook.status !== 'failed') {
                return { success: false, error: `Webhook status is ${webhook.status}, not failed` };
            }

            // Process based on source
            const service = new VelocityWebhookService();
            const result = await service.processWebhook(webhook.payload);

            if (result.success) {
                await WebhookRetryService.markComplete(webhookId);
                return { success: true, result };
            } else {
                await WebhookRetryService.updateError(webhookId, result.error || 'Unknown error');
                return { success: false, error: result.error };
            }

        } catch (error: any) {
            logger.error('Webhook replay failed', { webhookId, error: error.message });
            await WebhookRetryService.updateError(webhookId, error.message);
            throw error;
        }
    }

    /**
     * Queue manual replay for specific webhook
     */
    static async queueReplay(webhookId: string): Promise<void> {
        await QueueManager.addJob(
            this.QUEUE_NAME,
            `replay-${webhookId}`,
            { webhookId }
        );
        logger.info('Webhook replay queued', { webhookId });
    }
}
