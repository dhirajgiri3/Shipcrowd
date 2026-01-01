/**
 * WooCommerce Webhook Authentication Middleware
 *
 * Verifies WooCommerce webhook signatures using HMAC-SHA256.
 * WooCommerce sends signature in X-WC-Webhook-Signature header.
 *
 * Security features:
 * - HMAC-SHA256 verification
 * - Constant-time comparison (prevents timing attacks)
 * - Raw body verification
 * - Store-specific secret validation
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import WooCommerceStore from '../../../../infrastructure/database/mongoose/models/WooCommerceStore';
import { AppError } from '../../../../shared/errors/AppError';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Verify WooCommerce webhook signature
 */
export async function verifyWooCommerceWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Get signature from header
    const signature = req.headers['x-wc-webhook-signature'] as string;

    if (!signature) {
      throw new AppError(
        'Missing X-WC-Webhook-Signature header',
        'WEBHOOK_SIGNATURE_MISSING',
        401
      );
    }

    // 2. Get webhook topic and source (store URL)
    const topic = req.headers['x-wc-webhook-topic'] as string;
    const source = req.headers['x-wc-webhook-source'] as string;

    if (!topic || !source) {
      throw new AppError(
        'Missing required webhook headers',
        'WEBHOOK_HEADERS_MISSING',
        400
      );
    }

    // 3. Extract store URL from source
    // Source format: "https://example.com"
    const storeUrl = source.replace(/\/$/, ''); // Remove trailing slash

    // 4. Find store by URL
    const store = await WooCommerceStore.findOne({
      storeUrl,
      isActive: true,
    });

    if (!store) {
      logger.warn('Webhook received from unknown store', {
        storeUrl,
        topic,
      });
      throw new AppError('Store not found or inactive', 'STORE_NOT_FOUND', 404);
    }

    // 5. Find webhook secret for this topic
    const webhook = store.webhooks.find((w) => w.topic === topic);

    if (!webhook) {
      logger.warn('Webhook topic not registered', {
        storeId: store._id,
        topic,
      });
      throw new AppError('Webhook topic not registered', 'WEBHOOK_NOT_REGISTERED', 404);
    }

    const webhookSecret = webhook.secret;

    // 6. Get raw body
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    // 7. Calculate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody, 'utf8')
      .digest('base64');

    // 8. Verify signature using constant-time comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'base64'),
      Buffer.from(expectedSignature, 'base64')
    );

    if (!isValid) {
      logger.error('WooCommerce webhook signature verification failed', {
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

    // 9. Signature valid - attach store to request
    (req as any).woocommerceStore = store;
    (req as any).webhookTopic = topic;

    logger.debug('WooCommerce webhook verified', {
      storeId: store._id,
      topic,
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
 * WooCommerce webhook verification requires raw body
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
