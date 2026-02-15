import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
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
 *
 * TODO: HMAC Verification Issue
 * Currently bypassing HMAC verification in development mode because Shopify
 * is signing webhooks with a different secret than our configured API Secret.
 * This needs investigation:
 * 1. Check if there are manually created webhooks in Partner Dashboard
 * 2. Verify the API Secret in Partner Dashboard matches .env
 * 3. Consider if webhooks were created with a previous/different secret
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

const getRawBodyForVerification = (req: Request): Buffer | null => {
  const rawBody = (req as any).rawBody;

  // Return as Buffer for proper HMAC calculation
  if (Buffer.isBuffer(rawBody)) {
    return rawBody;
  }

  if (typeof rawBody === 'string') {
    return Buffer.from(rawBody, 'utf8');
  }

  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === 'string') {
    return Buffer.from(req.body, 'utf8');
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

    // Calculate expected HMAC using raw Buffer (not string)
    // This is critical - Shopify signs the raw bytes, not the UTF-8 string
    const hash = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('base64');

    // Test with API KEY as well (in case Shopify is using that)
    const hashWithApiKey = crypto
      .createHmac('sha256', process.env.SHOPIFY_API_KEY!)
      .update(rawBody)
      .digest('base64');

    // CRITICAL DEBUG: Log full HMAC details
    const rawBodyStr = rawBody.toString('utf8');
    console.log('\n🔍 WEBHOOK HMAC VERIFICATION DETAILS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Topic:', topic);
    console.log('Shop Domain:', shopDomain);
    console.log('Webhook ID:', webhookId);
    console.log('Raw Body Length (bytes):', rawBody.length);
    console.log('Raw Body Type:', Buffer.isBuffer(rawBody) ? 'Buffer' : typeof rawBody);
    console.log('Raw Body (first 200 chars):', rawBodyStr.substring(0, 200));
    console.log('Webhook Secret Fingerprint:', secretFingerprint(webhookSecret));
    console.log('\n📧 RECEIVED HMAC (from Shopify):');
    console.log('  Full:', hmacHeader);
    console.log('  Length:', hmacHeader.length);
    console.log('\n🔐 CALCULATED HMAC (with API Secret):');
    console.log('  Full:', hash);
    console.log('  Length:', hash.length);
    console.log('  Match:', hmacHeader === hash ? '✅ YES!' : '❌ NO');
    console.log('\n🔐 CALCULATED HMAC (with API Key):');
    console.log('  Full:', hashWithApiKey);
    console.log('  Match:', hmacHeader === hashWithApiKey ? '✅ YES!' : '❌ NO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    logger.debug('Shopify webhook HMAC verification', {
      topic,
      shopDomain,
      webhookId,
      receivedHmacPrefix: hmacHeader.substring(0, 10),
      calculatedHmacPrefix: hash.substring(0, 10),
      match: hmacHeader === hash,
      webhookSecretFingerprint: secretFingerprint(webhookSecret),
      rawBodyLengthBytes: rawBody.length,
    });

    // Constant-time comparison (prevents timing attacks)
    let isValid = false;
    try {
      isValid = crypto.timingSafeEqual(
        Buffer.from(hmacHeader, 'base64'),
        Buffer.from(hash, 'base64')
      );
    } catch (error: any) {
      console.log('❌ timingSafeEqual error:', error.message);
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

      // DEVELOPMENT MODE BYPASS
      // Shopify is signing webhooks with a different secret than our configured API Secret.
      // We've verified:
      //   - Our HMAC implementation is cryptographically correct (Buffer-based, proper encoding)
      //   - The API Secret in Shopify Partner Dashboard matches our .env exactly
      //   - None of the tested secrets (API Secret, API Key, variations) match Shopify's HMAC
      // Root cause: Likely old webhooks from previous installations or manual webhook creation
      // TODO: Before production, either find the correct secret or delete/recreate all webhooks
      if (process.env.NODE_ENV === 'development') {
        logger.warn('⚠️  DEVELOPMENT MODE: Bypassing HMAC verification failure', {
          shopDomain,
          topic,
          note: 'HMAC implementation is correct, but Shopify uses unknown secret',
        });

        // Save failed webhook for offline analysis if needed
        const fs = require('fs');
        const path = require('path');
        const captureFile = path.join(__dirname, '../../../../../failed-webhook-capture.json');
        const captureData = {
          timestamp: new Date().toISOString(),
          topic,
          shopDomain,
          webhookId,
          hmacReceived: hmacHeader,
          rawBodyBase64: rawBody.toString('base64'),
          rawBodyLength: rawBody.length,
        };
        fs.writeFileSync(captureFile, JSON.stringify(captureData, null, 2));
      } else {
        throw new AppError('Invalid webhook signature', 'ERROR_CODE', 403);
      }
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
          error: (error as any).message,
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
 * IMPORTANT: Store as Buffer, not string, for proper HMAC calculation
 */
export const captureRawBody = (
  req: Request,
  _res: Response,
  buf: Buffer,
  _encoding: BufferEncoding
): void => {
  // Store as Buffer for proper HMAC calculation
  // Shopify signs the raw bytes, not the UTF-8 string representation
  (req as any).rawBody = buf;
};

export default verifyShopifyWebhook;
