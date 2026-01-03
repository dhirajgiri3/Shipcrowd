import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ShopifyStore } from '../../../../infrastructure/database/mongoose/models';
import { AppError } from '../../../../shared/errors/app.error';
import winston from 'winston';

/**
 * Shopify Webhook Authentication Middleware
 *
 * Verifies HMAC-SHA256 signature from Shopify webhooks.
 *
 * Security Features:
 * - HMAC-SHA256 verification using webhook secret
 * - Constant-time comparison (timing attack safe)
 * - Raw body verification (prevents tampering)
 * - Store validation
 *
 * Headers used:
 * - X-Shopify-Hmac-Sha256: HMAC signature
 * - X-Shopify-Shop-Domain: Store domain
 * - X-Shopify-Topic: Webhook topic
 * - X-Shopify-Webhook-Id: Unique webhook ID
 */

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

/**
 * Verify Shopify webhook HMAC signature
 */
export const verifyShopifyWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hmacHeader = req.headers['x-shopify-hmac-sha256'] as string;
    const shopDomain = req.headers['x-shopify-shop-domain'] as string;
    const topic = req.headers['x-shopify-topic'] as string;
    const webhookId = req.headers['x-shopify-webhook-id'] as string;

    // Validate required headers
    if (!hmacHeader) {
      throw new AppError('Missing X-Shopify-Hmac-Sha256 header', 'ERROR_CODE', 401);
    }

    if (!shopDomain) {
      throw new AppError('Missing X-Shopify-Shop-Domain header', 'ERROR_CODE', 401);
    }

    if (!topic) {
      throw new AppError('Missing X-Shopify-Topic header', 'ERROR_CODE', 401);
    }

    // Get raw body (must be set by express.raw() middleware)
    const rawBody = (req as any).rawBody;

    if (!rawBody) {
      throw new AppError('Raw body not available for HMAC verification', 'ERROR_CODE', 500);
    }

    // Get webhook secret from environment
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.error('SHOPIFY_WEBHOOK_SECRET not configured');
      throw new AppError('Webhook secret not configured', 'ERROR_CODE', 500);
    }

    // Calculate expected HMAC
    const hash = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody, 'utf8')
      .digest('base64');

    // Constant-time comparison (prevents timing attacks)
    const isValid = crypto.timingSafeEqual(
      Buffer.from(hmacHeader, 'base64'),
      Buffer.from(hash, 'base64')
    );

    if (!isValid) {
      logger.warn('Invalid webhook HMAC signature', {
        shopDomain,
        topic,
        webhookId,
      });
      throw new AppError('Invalid webhook signature', 'ERROR_CODE', 403);
    }

    // Find and validate store
    const store = await ShopifyStore.findOne({
      shopDomain,
      isActive: true,
    });

    if (!store) {
      logger.warn('Webhook received for unknown or inactive store', {
        shopDomain,
        topic,
      });
      throw new AppError('Store not found or inactive', 'ERROR_CODE', 404);
    }

    // Attach store and webhook metadata to request
    (req as any).shopifyStore = store;
    (req as any).shopifyWebhook = {
      topic,
      webhookId,
      shopDomain,
      verified: true,
    };

    logger.debug('Webhook verified', {
      shopDomain,
      topic,
      webhookId,
      storeId: store._id,
    });

    next();
  } catch (error) {
    if (error instanceof AppError) {
      // Return 200 to prevent Shopify from retrying invalid requests
      if (error.statusCode === 403 || error.statusCode === 401) {
        logger.error('Webhook authentication failed', {
          error: error.message,
          shopDomain: req.headers['x-shopify-shop-domain'],
        });
        res.status(200).json({
          received: false,
          error: 'Authentication failed',
        });
        return;
      }
    }

    next(error);
  }
};

/**
 * Express middleware to capture raw body for HMAC verification
 *
 * Must be applied BEFORE express.json() middleware
 */
export const captureRawBody = (
  req: Request,
  res: Response,
  buf: Buffer,
  encoding: BufferEncoding
): void => {
  (req as any).rawBody = buf.toString(encoding || 'utf8');
};

export default verifyShopifyWebhook;
