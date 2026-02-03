import { FailedWebhook } from '@/infrastructure/database/mongoose/models/system/failed-webhook.model';
import logger from '@/shared/logger/winston.logger';

/**
 * Webhook Audit Service
 * 
 * Stores failed webhooks for audit trail and manual replay.
 * Does NOT handle automatic retries - Velocity does that.
 */
export class WebhookRetryService {
    /**
     * Store failed webhook for audit/replay
     */
    static async storeFailedWebhook(
        source: string,
        eventType: string,
        payload: any,
        headers: any,
        error: string
    ): Promise<void> {
        try {
            await FailedWebhook.create({
                source,
                eventType,
                payload,
                headers,
                error,
                status: 'failed' // Start as failed, no auto-retry
            });

            logger.info('Failed webhook stored for audit', { source, eventType });
        } catch (dbError: any) {
            logger.error('Failed to store failed webhook', {
                source,
                error: dbError.message,
                originalError: error
            });
            // Critical: We failed to store the failure. Log to Sentry/Alert immediately in production.
        }
    }

    /**
     * Get webhook by ID (for manual replay)
     */
    static async getWebhookById(id: string) {
        return FailedWebhook.findById(id);
    }

    /**
     * Mark webhook as successfully replayed
     */
    static async markComplete(id: string) {
        await FailedWebhook.findByIdAndUpdate(id, {
            status: 'completed'
        });
    }

    /**
     * Update error message
     */
    static async updateError(id: string, error: string) {
        await FailedWebhook.findByIdAndUpdate(id, {
            error,
            $inc: { retryCount: 1 }
        });
    }

    /**
     * Get recent failed webhooks (for admin dashboard)
     */
    static async getRecentFailures(limit: number = 50) {
        return FailedWebhook.find({ status: 'failed' })
            .sort({ createdAt: -1 })
            .limit(limit);
    }
}
