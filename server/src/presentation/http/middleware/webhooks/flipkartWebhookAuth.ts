/**
 * Flipkart Webhook Authentication Middleware
 *
 * Verifies Flipkart webhook signatures using HMAC-SHA256.
 * Flipkart sends signature in X-Flipkart-Signature header.
 *
 * Security features:
 * - HMAC-SHA256 verification
 * - Constant-time comparison (prevents timing attacks)
 * - Raw body verification
 * - Store-specific secret validation
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import FlipkartStore from '../../../../infrastructure/database/mongoose/models/flipkart-store.model';
import { AppError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Verify Flipkart webhook signature
 */
export async function verifyFlipkartWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Get signature from header
    const signature = req.headers['x-flipkart-signature'] as string;

    if (!signature) {
      throw new AppError(
        'Missing X-Flipkart-Signature header',
        'WEBHOOK_SIGNATURE_MISSING',
        401
      );
    }

    // 2. Get webhook topic and seller ID
    const topic = req.headers['x-flipkart-topic'] as string;
    const sellerId = req.headers['x-flipkart-seller-id'] as string;

    if (!topic || !sellerId) {
      throw new AppError(
        'Missing required webhook headers',
        'WEBHOOK_HEADERS_MISSING',
        400
      );
    }

    // 3. Find store by seller ID
    const store = await FlipkartStore.findOne({
      sellerId,
      isActive: true,
    }).select('+apiKey +apiSecret');

    if (!store) {
      logger.warn('Webhook received from unknown store', {
        sellerId,
        topic,
      });
      throw new AppError('Store not found or inactive', 'STORE_NOT_FOUND', 404);
    }

    // 4. Find webhook secret for this topic
    const webhook = store.webhooks.find((w) => w.topic === topic);

    if (!webhook) {
      logger.warn('Webhook topic not registered', {
        storeId: store._id,
        topic,
      });
      throw new AppError('Webhook topic not registered', 'WEBHOOK_NOT_REGISTERED', 404);
    }

    const webhookSecret = webhook.secret;

    // 5. Get raw body
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    // 6. Calculate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody, 'utf8')
      .digest('hex');

    // 7. Verify signature using constant-time comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    if (!isValid) {
      logger.error('Flipkart webhook signature verification failed', {
        storeId: store._id,
        topic,
        receivedSignature: signature.substring(0, 10) + '...',
        expectedSignature: expectedSignature.substring(0, 10) + '...',
      });

      throw new AppError(
        'Invalid webhook signature',
        'WEBHOOK_SIGNATURE_INVALID',
        401
      );
    }

    // 8. Signature valid - attach store and metadata to request
    (req as any).flipkartStore = store;
    (req as any).flipkartWebhook = {
      topic,
      sellerId,
      verified: true,
    };

    logger.debug('Flipkart webhook verified', {
      storeId: store._id,
      topic,
      sellerId,
    });

    next();
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    } else {
      logger.error('Webhook verification error', {
        error: (error as Error).message,
      });

      res.status(500).json({
        success: false,
        error: 'Webhook verification failed',
      });
    }
  }
}

/**
 * Raw body parser middleware
 * Flipkart webhook verification requires raw body
 */
export function rawBodyParser(req: Request, res: Response, next: NextFunction): void {
  let data = '';

  req.on('data', (chunk) => {
    data += chunk;
  });

  req.on('end', () => {
    (req as any).rawBody = data;
    try {
      req.body = JSON.parse(data);
    } catch (error) {
      req.body = {};
    }
    next();
  });
}
