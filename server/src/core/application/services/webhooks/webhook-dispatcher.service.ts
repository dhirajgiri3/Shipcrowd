import * as crypto from 'crypto';
import { Company } from '../../../../infrastructure/database/mongoose/models';
import QueueManager from '../../../../infrastructure/utilities/queue-manager';
import logger from '../../../../shared/logger/winston.logger';

class WebhookDispatcherService {

    /**
     * Dispatch event to company webhook via Redis Queue
     */
    async dispatch(companyId: string, event: string, payload: any) {
        try {
            const company = await Company.findById(companyId).select('settings.webhook name');

            // 1. Basic Validation
            if (!company?.settings?.webhook?.enabled || !company.settings.webhook.url) {
                return;
            }

            const webhookConfig = company.settings.webhook;

            // 2. Subscription Check
            if (webhookConfig.events && webhookConfig.events.length > 0 && !webhookConfig.events.includes(event)) {
                return;
            }

            // 3. Prepare Payload
            const webhookPayload = {
                id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                event,
                created_at: new Date().toISOString(),
                data: payload
            };

            // 4. Generate Signature (HMAC SHA256)
            const signature = crypto
                .createHmac('sha256', webhookConfig.secret || '')
                .update(JSON.stringify(webhookPayload))
                .digest('hex');

            // 5. Add to Redis Queue
            await QueueManager.addJob(
                'outbound-webhooks',
                'send-webhook',
                {
                    url: webhookConfig.url,
                    signature,
                    payload: webhookPayload,
                    companyId: companyId
                }
            );

            logger.info(`Webhook queued for ${company.name}`, { event, companyId });

        } catch (error) {
            logger.error('Error dispatching webhook', { companyId, event, error });
        }
    }

    private generateSignature(payload: any, secret: string): string {
        if (!secret) return '';
        return crypto
            .createHmac('sha256', secret)
            .update(JSON.stringify(payload))
            .digest('hex');
    }

    /**
     * Initialize the worker to process webhook jobs
     */
    async initializeWorker() {
        await QueueManager.registerWorker({
            queueName: 'outbound-webhooks',
            concurrency: 5,
            processor: async (job) => {
                const { url, signature, payload, companyId } = job.data;

                try {
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Shipcrowd-Signature': signature,
                            'X-Shipcrowd-Event': payload.event,
                            'User-Agent': 'Shipcrowd-Webhook/1.0'
                        },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) {
                        throw new Error(`Webhook failed with status ${response.status} ${response.statusText}`);
                    }

                    logger.info(`Webhook sent successfully`, { jobId: job.id, companyId });
                    return { success: true, status: response.status };

                } catch (error: any) {
                    logger.error(`Webhook delivery failed`, { jobId: job.id, error: error.message });
                    throw error; // Triggers retry in BullMQ
                }
            }
        });
        logger.info('Webhook Worker initialized');
    }
}

export default new WebhookDispatcherService();
