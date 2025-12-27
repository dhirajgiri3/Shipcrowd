/**
 * Velocity Webhook Authentication Middleware
 *
 * Verifies HMAC-SHA256 signatures for incoming webhooks from Velocity Shipfast
 * Protects against replay attacks using timestamp validation
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import logger from '../../../../shared/logger/winston.logger';

// Webhook secret - should be stored in environment variables
const WEBHOOK_SECRET = process.env.VELOCITY_WEBHOOK_SECRET || 'default-webhook-secret-change-me';

// Replay attack protection - reject webhooks older than 5 minutes
const WEBHOOK_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

export interface WebhookRequest extends Request {
  webhookPayload?: any;
  webhookVerified: boolean;
}

/**
 * Compute HMAC-SHA256 signature
 */
function computeSignature(payload: string, timestamp: string, secret: string): string {
  const signaturePayload = `${timestamp}.${payload}`;
  return crypto
    .createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex');
}

/**
 * Verify webhook signature using HMAC-SHA256
 */
export const verifyVelocityWebhookSignature = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract headers
    const signature = req.headers['x-velocity-signature'] as string;
    const timestamp = req.headers['x-velocity-timestamp'] as string;
    const eventType = req.headers['x-velocity-event-type'] as string;

    // Validate required headers
    if (!signature) {
      logger.warn('Webhook rejected: Missing x-velocity-signature header');
      res.status(401).json({
        success: false,
        error: 'Missing webhook signature'
      });
      return;
    }

    if (!timestamp) {
      logger.warn('Webhook rejected: Missing x-velocity-timestamp header');
      res.status(401).json({
        success: false,
        error: 'Missing webhook timestamp'
      });
      return;
    }

    // Validate timestamp format
    const webhookTimestamp = parseInt(timestamp, 10);
    if (isNaN(webhookTimestamp)) {
      logger.warn('Webhook rejected: Invalid timestamp format', { timestamp });
      res.status(401).json({
        success: false,
        error: 'Invalid webhook timestamp format'
      });
      return;
    }

    // Replay attack protection
    const currentTimestamp = Date.now();
    const timeDifference = Math.abs(currentTimestamp - webhookTimestamp);

    if (timeDifference > WEBHOOK_TIMESTAMP_TOLERANCE_MS) {
      logger.warn('Webhook rejected: Timestamp too old (replay attack protection)', {
        webhookTimestamp,
        currentTimestamp,
        timeDifference,
        toleranceMs: WEBHOOK_TIMESTAMP_TOLERANCE_MS
      });
      res.status(401).json({
        success: false,
        error: 'Webhook timestamp too old or too far in future'
      });
      return;
    }

    // Get raw body for signature verification
    // Note: Express body parser should be configured with { verify: (req, res, buf) => { req.rawBody = buf } }
    const rawBody = (req as any).rawBody?.toString('utf-8') || JSON.stringify(req.body);

    // Compute expected signature
    const expectedSignature = computeSignature(rawBody, timestamp, WEBHOOK_SECRET);

    // Constant-time comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      logger.warn('Webhook rejected: Invalid signature', {
        eventType,
        receivedSignature: signature.substring(0, 10) + '...',
        expectedSignature: expectedSignature.substring(0, 10) + '...'
      });
      res.status(401).json({
        success: false,
        error: 'Invalid webhook signature'
      });
      return;
    }

    // Signature verified successfully
    logger.info('Webhook signature verified successfully', {
      eventType,
      timestamp: webhookTimestamp
    });

    // Attach verified payload to request
    (req as WebhookRequest).webhookPayload = req.body;
    (req as WebhookRequest).webhookVerified = true;

    next();
  } catch (error) {
    logger.error('Error verifying webhook signature:', error);
    res.status(500).json({
      success: false,
      error: 'Internal error verifying webhook'
    });
  }
};

/**
 * Optional: Skip signature verification for development/testing
 * WARNING: NEVER use this in production
 */
export const bypassWebhookVerification = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (process.env.NODE_ENV === 'production') {
    logger.error('SECURITY WARNING: Attempted to bypass webhook verification in production');
    res.status(403).json({
      success: false,
      error: 'Webhook verification bypass not allowed in production'
    });
    return;
  }

  logger.warn('DEVELOPMENT MODE: Bypassing webhook signature verification');
  (req as WebhookRequest).webhookPayload = req.body;
  (req as WebhookRequest).webhookVerified = true;
  next();
};
