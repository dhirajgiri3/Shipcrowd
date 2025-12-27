/**
 * Webhook Retry Service
 *
 * Handles retry logic for failed webhook processing with exponential backoff
 * Implements dead letter queue for persistent failures
 */

import logger from '../../../../shared/logger/winston.logger';
import WebhookDeadLetter from '../../../../infrastructure/database/mongoose/models/WebhookDeadLetter';
import {
  VelocityWebhookPayload,
  WebhookProcessingResult,
  WebhookRetryConfig,
  DEFAULT_WEBHOOK_RETRY_CONFIG
} from '../../../../infrastructure/external/couriers/velocity/VelocityWebhookTypes';
import { VelocityWebhookService } from './velocityWebhook.service';

export class WebhookRetryService {
  private config: WebhookRetryConfig;
  private webhookService: VelocityWebhookService;

  constructor(config: WebhookRetryConfig = DEFAULT_WEBHOOK_RETRY_CONFIG) {
    this.config = config;
    this.webhookService = new VelocityWebhookService();
  }

  /**
   * Process webhook with retry logic
   */
  async processWithRetry(
    payload: VelocityWebhookPayload,
    headers: Record<string, string> = {}
  ): Promise<WebhookProcessingResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        // Log retry attempt
        if (attempt > 0) {
          logger.info('Retrying webhook processing', {
            attempt: attempt + 1,
            maxRetries: this.config.maxRetries,
            awb: payload.shipment_data.awb,
            eventType: payload.event_type
          });

          // Apply exponential backoff delay
          const delay = this.config.retryDelays[attempt - 1] || this.config.retryDelays[this.config.retryDelays.length - 1];
          await this.sleep(delay);
        }

        // Attempt to process webhook
        const result = await this.webhookService.processWebhook(payload);

        if (result.success) {
          return result;
        }

        // Create error for non-successful result
        lastError = new Error(result.error || 'Webhook processing failed');
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.warn('Webhook processing attempt failed', {
          attempt: attempt + 1,
          error: lastError.message,
          awb: payload.shipment_data.awb
        });
      }
    }

    // All retries exhausted - send to dead letter queue if enabled
    if (this.config.deadLetterQueueEnabled) {
      await this.sendToDeadLetterQueue(payload, headers, lastError);
    }

    // Return failure result
    return {
      success: false,
      awb: payload.shipment_data.awb,
      orderId: payload.shipment_data.order_id,
      statusUpdated: false,
      error: `Failed after ${this.config.maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
      timestamp: new Date()
    };
  }

  /**
   * Send failed webhook to dead letter queue
   */
  private async sendToDeadLetterQueue(
    payload: VelocityWebhookPayload,
    headers: Record<string, string>,
    error: Error | null
  ): Promise<void> {
    try {
      await WebhookDeadLetter.create({
        provider: 'velocity-shipfast',
        eventType: payload.event_type,
        payload: payload,
        headers: headers,
        receivedAt: new Date(payload.timestamp || Date.now()),
        processingAttempts: this.config.maxRetries,
        lastAttemptAt: new Date(),
        lastError: error?.message || 'Unknown error',
        errorStack: error?.stack,
        status: 'failed'
      });

      logger.error('Webhook sent to dead letter queue', {
        awb: payload.shipment_data.awb,
        orderId: payload.shipment_data.order_id,
        eventType: payload.event_type,
        error: error?.message
      });
    } catch (dlqError) {
      logger.error('Failed to save webhook to dead letter queue', {
        error: dlqError,
        originalError: error?.message
      });
    }
  }

  /**
   * Retry webhooks from dead letter queue
   */
  async retryFromDeadLetterQueue(limit: number = 10): Promise<{
    attempted: number;
    successful: number;
    failed: number;
  }> {
    try {
      // Get pending/failed webhooks
      const deadLetters = await WebhookDeadLetter.find({
        provider: 'velocity-shipfast',
        status: { $in: ['pending', 'failed'] }
      })
        .sort({ receivedAt: 1 })
        .limit(limit);

      let successful = 0;
      let failed = 0;

      for (const deadLetter of deadLetters) {
        try {
          // Update status to retrying
          deadLetter.status = 'retrying';
          deadLetter.processingAttempts++;
          deadLetter.lastAttemptAt = new Date();
          await deadLetter.save();

          // Attempt to process
          const result = await this.webhookService.processWebhook(
            deadLetter.payload as VelocityWebhookPayload
          );

          if (result.success) {
            // Mark as resolved
            deadLetter.status = 'resolved';
            deadLetter.resolvedAt = new Date();
            await deadLetter.save();
            successful++;

            logger.info('Dead letter webhook processed successfully', {
              deadLetterId: deadLetter._id,
              awb: deadLetter.payload.shipment_data?.awb
            });
          } else {
            // Mark as failed again
            deadLetter.status = 'failed';
            deadLetter.lastError = result.error || 'Retry failed';
            await deadLetter.save();
            failed++;
          }
        } catch (error) {
          // Mark as failed
          deadLetter.status = 'failed';
          deadLetter.lastError = error instanceof Error ? error.message : 'Unknown error';
          deadLetter.errorStack = error instanceof Error ? error.stack : undefined;
          await deadLetter.save();
          failed++;

          logger.error('Error retrying dead letter webhook', {
            deadLetterId: deadLetter._id,
            error
          });
        }
      }

      logger.info('Dead letter queue retry completed', {
        attempted: deadLetters.length,
        successful,
        failed
      });

      return {
        attempted: deadLetters.length,
        successful,
        failed
      };
    } catch (error) {
      logger.error('Error processing dead letter queue', { error });
      throw error;
    }
  }

  /**
   * Get dead letter queue statistics
   */
  async getDeadLetterStats(): Promise<{
    total: number;
    pending: number;
    retrying: number;
    failed: number;
    resolved: number;
  }> {
    try {
      const stats = await WebhookDeadLetter.aggregate([
        {
          $match: { provider: 'velocity-shipfast' }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const result = {
        total: 0,
        pending: 0,
        retrying: 0,
        failed: 0,
        resolved: 0
      };

      stats.forEach(stat => {
        result[stat._id as keyof typeof result] = stat.count;
        result.total += stat.count;
      });

      return result;
    } catch (error) {
      logger.error('Error getting dead letter stats', { error });
      throw error;
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
