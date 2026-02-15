import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ShopifyStore } from '../../../../infrastructure/database/mongoose/models';
import { AppError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

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

/**
 * Verify Shopify webhook HMAC signature
 */
const secretFingerprint = (secret: string): string =>
  crypto.createHash('sha256').update(secret).digest('hex').slice(0, 12);

const resolveWebhookSecret = (): string | null => {
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
  const apiSecret = process.env.SHOPIFY_API_SECRET;

  if (webhookSecret && apiSecret && webhookSecret !== apiSecret) {
    logger.warn('Shopify secrets differ; using SHOPIFY_WEBHOOK_SECRET for webhook verification', {
      webhookSecretFingerprint: secretFingerprint(webhookSecret),
      apiSecretFingerprint: secretFingerprint(apiSecret),
    });
  }

  return webhookSecret || apiSecret || null;
};

const getRawBodyForVerification = (req: Request): string | null => {
  const rawBody = (req as any).rawBody;

  if (typeof rawBody === 'string') {
    return rawBody;
  }

  if (Buffer.isBuffer(rawBody)) {
    return rawBody.toString('utf8');
  }

  if (Buffer.isBuffer(req.body)) {
    return req.body.toString('utf8');
  }

  if (typeof req.body === 'string') {
    return req.body;
  }

  return null;
};

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
    const rawBody = getRawBodyForVerification(req);

    if (!rawBody) {
      throw new AppError('Raw body not available for HMAC verification', 'ERROR_CODE', 500);
    }

    // Get webhook secret from environment
    const webhookSecret = resolveWebhookSecret();

    if (!webhookSecret) {
      logger.error('Shopify webhook secret not configured (SHOPIFY_WEBHOOK_SECRET/SHOPIFY_API_SECRET)');
      throw new AppError('Webhook secret not configured', 'ERROR_CODE', 500);
    }

    // Calculate expected HMAC
    const hash = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody, 'utf8')
      .digest('base64');

    logger.debug('Shopify webhook HMAC verification', {
      topic,
      shopDomain,
      webhookId,
      receivedHmacPrefix: hmacHeader.substring(0, 10),
      calculatedHmacPrefix: hash.substring(0, 10),
      match: hmacHeader === hash,
      webhookSecretFingerprint: secretFingerprint(webhookSecret),
      rawBodyLength: rawBody.length,
    });

    // Constant-time comparison (prevents timing attacks)
    let isValid = false;
    try {
      isValid = crypto.timingSafeEqual(
        Buffer.from(hmacHeader, 'base64'),
        Buffer.from(hash, 'base64')
      );
    } catch {
      isValid = false;
    }

    if (!isValid) {
      logger.warn('Invalid webhook HMAC signature', {
        shopDomain,
        topic,
        webhookId,
        receivedHmacPrefix: hmacHeader.substring(0, 10),
        calculatedHmacPrefix: hash.substring(0, 10),
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
      // Return 401 so Shopify retries and transient/config issues are recoverable.
      if (error.statusCode === 403 || error.statusCode === 401) {
        logger.error('Webhook authentication failed', {
          error: error.message,
          shopDomain: req.headers['x-shopify-shop-domain'],
        });
        res.status(401).json({
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
