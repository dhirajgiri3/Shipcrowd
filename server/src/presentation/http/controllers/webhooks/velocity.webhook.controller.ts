/**
 * Velocity Webhook Controller
 *
 * Handles incoming webhooks from Velocity Shipfast courier service
 * Endpoint: POST /api/v1/webhooks/velocity
 */

import { Response, NextFunction } from 'express';
import { VelocityWebhookService } from '../../../../core/application/services/webhooks/velocityWebhook.service';
import { VelocityWebhookPayload } from '../../../../infrastructure/external/couriers/velocity/VelocityWebhookTypes';
import { WebhookRequest } from '../../middleware/webhooks/velocityWebhookAuth';
import logger from '../../../../shared/logger/winston.logger';

// Initialize webhook service
const webhookService = new VelocityWebhookService();

// Metrics tracking
interface WebhookMetrics {
  totalReceived: number;
  successfulProcessed: number;
  failedProcessed: number;
  lastProcessedAt?: Date;
  processingTimes: number[];
}

const metrics: WebhookMetrics = {
  totalReceived: 0,
  successfulProcessed: 0,
  failedProcessed: 0,
  processingTimes: []
};

/**
 * Handle Velocity webhook
 * POST /api/v1/webhooks/velocity
 */
export const handleVelocityWebhook = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const webhookReq = req as WebhookRequest;
  const startTime = Date.now();

  try {
    // Verify webhook was authenticated by middleware
    if (!webhookReq.webhookVerified) {
      logger.error('Webhook not verified - middleware authentication failed');
      res.status(401).json({
        success: false,
        error: 'Webhook authentication failed'
      });
      return;
    }

    // Increment metrics
    metrics.totalReceived++;

    // Get payload
    const payload = webhookReq.webhookPayload as VelocityWebhookPayload;

    // Validate payload structure
    if (!payload || !payload.event_type || !payload.shipment_data) {
      logger.warn('Invalid webhook payload structure', { payload });
      metrics.failedProcessed++;
      res.status(400).json({
        success: false,
        error: 'Invalid webhook payload structure'
      });
      return;
    }

    logger.info('Processing Velocity webhook', {
      eventType: payload.event_type,
      awb: payload.shipment_data.awb,
      orderId: payload.shipment_data.order_id
    });

    // Process webhook
    const result = await webhookService.processWebhook(payload);

    // Track processing time
    const processingTime = Date.now() - startTime;
    metrics.processingTimes.push(processingTime);
    if (metrics.processingTimes.length > 100) {
      metrics.processingTimes.shift(); // Keep last 100 processing times
    }

    // Update metrics
    if (result.success) {
      metrics.successfulProcessed++;
      metrics.lastProcessedAt = new Date();
    } else {
      metrics.failedProcessed++;
    }

    // Log result
    logger.info('Webhook processing completed', {
      success: result.success,
      awb: result.awb,
      orderId: result.orderId,
      statusUpdated: result.statusUpdated,
      processingTimeMs: processingTime
    });

    // Return success response (always return 200 for Velocity to stop retrying)
    res.status(200).json({
      success: result.success,
      message: result.success ? 'Webhook processed successfully' : 'Webhook processing failed',
      data: {
        awb: result.awb,
        orderId: result.orderId,
        statusUpdated: result.statusUpdated,
        timestamp: result.timestamp
      },
      error: result.error
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    metrics.failedProcessed++;

    logger.error('Unhandled error processing webhook', {
      error,
      processingTimeMs: processingTime
    });

    // Return 200 to prevent Velocity from retrying
    // Log error internally for investigation
    res.status(200).json({
      success: false,
      message: 'Internal error processing webhook',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get webhook metrics
 * GET /api/v1/webhooks/velocity/metrics
 */
export const getWebhookMetrics = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Calculate average processing time
    const avgProcessingTime = metrics.processingTimes.length > 0
      ? metrics.processingTimes.reduce((a, b) => a + b, 0) / metrics.processingTimes.length
      : 0;

    res.status(200).json({
      success: true,
      data: {
        totalReceived: metrics.totalReceived,
        successfulProcessed: metrics.successfulProcessed,
        failedProcessed: metrics.failedProcessed,
        successRate: metrics.totalReceived > 0
          ? (metrics.successfulProcessed / metrics.totalReceived * 100).toFixed(2) + '%'
          : '0%',
        averageProcessingTimeMs: Math.round(avgProcessingTime),
        lastProcessedAt: metrics.lastProcessedAt
      }
    });
  } catch (error) {
    logger.error('Error retrieving webhook metrics', { error });
    next(error);
  }
};

/**
 * Health check endpoint for webhooks
 * GET /api/v1/webhooks/velocity/health
 */
export const webhookHealthCheck = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      message: 'Velocity webhook endpoint is healthy',
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error in webhook health check', { error });
    next(error);
  }
};
