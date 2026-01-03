/**
 * WooCommerceOAuthService
 *
 * Handles WooCommerce store authentication and connection management.
 * Unlike Shopify, WooCommerce uses REST API with consumer key/secret (OAuth 1.0a).
 *
 * Flow:
 * 1. User provides store URL + consumer key/secret
 * 2. Credentials are verified by making test API call
 * 3. Store is saved with encrypted credentials
 * 4. Webhooks are registered
 *
 * Note: WooCommerce doesn't have an OAuth 2.0 flow like Shopify.
 * Merchants generate API keys manually in their WooCommerce settings.
 */

import { WooCommerceStore } from '../../../../infrastructure/database/mongoose/models';
import WooCommerceClient from '../../../../infrastructure/external/ecommerce/woocommerce/woocommerce.client';
import { WooCommerceWebhook } from '../../../../infrastructure/external/ecommerce/woocommerce/woocommerce.types';
import { AppError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Webhook topics to register
 * WooCommerce webhook format: resource.event
 */
const WEBHOOK_TOPICS = [
  'order.created',
  'order.updated',
  'order.deleted',
  'product.created',
  'product.updated',
  'product.deleted',
  'customer.created',
  'customer.updated',
] as const;

export type WooCommerceWebhookTopic = (typeof WEBHOOK_TOPICS)[number];

interface InstallStoreParams {
  companyId: string;
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  storeName?: string;
}

interface WebhookRegistrationResult {
  topic: WooCommerceWebhookTopic;
  webhookId: number;
  success: boolean;
  error?: string;
}

export default class WooCommerceOAuthService {
  /**
   * Test connection to WooCommerce store
   * Verifies credentials by making a system status API call
   */
  static async testConnection(
    storeUrl: string,
    consumerKey: string,
    consumerSecret: string
  ): Promise<boolean> {
    try {
      const client = new WooCommerceClient({
        storeUrl,
        consumerKey,
        consumerSecret,
      });

      const connected = await client.testConnection();

      if (!connected) {
        throw new AppError('Failed to connect to WooCommerce store', 'WOOCOMMERCE_CONNECTION_FAILED', 400);
      }

      logger.info('WooCommerce connection test successful', { storeUrl });
      return true;
    } catch (error: any) {
      logger.error('WooCommerce connection test failed', {
        storeUrl,
        error: error.message,
      });

      throw new AppError(
        `Failed to connect to WooCommerce store: ${error.message}`,
        'WOOCOMMERCE_CONNECTION_FAILED',
        400
      );
    }
  }

  /**
   * Install WooCommerce store
   * Saves store with encrypted credentials and registers webhooks
   */
  static async installStore(params: InstallStoreParams): Promise<any> {
    const { companyId, storeUrl, consumerKey, consumerSecret, storeName } = params;

    try {
      // 1. Test connection first
      await this.testConnection(storeUrl, consumerKey, consumerSecret);

      // 2. Get store information
      const client = new WooCommerceClient({
        storeUrl,
        consumerKey,
        consumerSecret,
      });

      const systemStatus = await client.getStoreInfo();

      // 3. Check if store already exists
      const existingStore = await WooCommerceStore.findOne({
        companyId,
        storeUrl,
      });

      if (existingStore) {
        throw new AppError(
          'WooCommerce store already connected',
          'WOOCOMMERCE_STORE_ALREADY_EXISTS',
          400
        );
      }

      // 4. Create store record with encrypted credentials
      const store = await WooCommerceStore.create({
        companyId,
        storeUrl,
        storeName: storeName || systemStatus.environment.site_url,
        consumerKey, // Will be encrypted in pre-save hook
        consumerSecret, // Will be encrypted in pre-save hook
        apiVersion: 'wc/v3',
        wpVersion: systemStatus.environment.wp_version,
        wcVersion: systemStatus.environment.version,
        currency: systemStatus.settings.currency,
        timezone: systemStatus.environment.default_timezone,
        isActive: true,
        installedAt: new Date(),
        syncConfig: {
          orderSync: {
            enabled: true,
            autoSync: true,
            syncInterval: 15, // 15 minutes
            syncStatus: 'IDLE',
            errorCount: 0,
          },
          inventorySync: {
            enabled: true,
            autoSync: false, // Manual inventory sync by default
            syncInterval: 60, // 1 hour
            syncDirection: 'ONE_WAY', // Shipcrowd → WooCommerce
            errorCount: 0,
          },
          webhooksEnabled: true,
        },
        webhooks: [],
        stats: {
          totalOrdersSynced: 0,
          totalProductsMapped: 0,
          totalInventorySyncs: 0,
        },
      });

      logger.info('WooCommerce store installed successfully', {
        storeId: store._id,
        storeUrl,
        companyId,
      });

      // 5. Register webhooks (non-blocking)
      this.registerWebhooks(String(store._id)).catch((error) => {
        logger.error('Failed to register WooCommerce webhooks', {
          storeId: store._id,
          error: error.message,
        });
      });

      return store;
    } catch (error: any) {
      logger.error('Failed to install WooCommerce store', {
        storeUrl,
        companyId,
        error: error.message,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        `Failed to install WooCommerce store: ${error.message}`,
        'WOOCOMMERCE_INSTALLATION_FAILED',
        500
      );
    }
  }

  /**
   * Register webhooks for a WooCommerce store
   * Creates webhooks for order, product, and customer events
   */
  static async registerWebhooks(storeId: string): Promise<WebhookRegistrationResult[]> {
    try {
      const store = await WooCommerceStore.findById(storeId);

      if (!store) {
        throw new AppError('WooCommerce store not found', 'WOOCOMMERCE_STORE_NOT_FOUND', 404);
      }

      const client = new WooCommerceClient({
        storeUrl: store.storeUrl,
        consumerKey: store.decryptConsumerKey(),
        consumerSecret: store.decryptConsumerSecret(),
      });

      const appUrl = process.env.APP_URL || 'https://api.shipcrowd.com';
      const results: WebhookRegistrationResult[] = [];

      for (const topic of WEBHOOK_TOPICS) {
        try {
          // Generate webhook secret for this topic
          const webhookSecret = this.generateWebhookSecret();

          // Create webhook in WooCommerce
          const webhook = await client.post<WooCommerceWebhook>('/webhooks', {
            name: `Shipcrowd - ${topic}`,
            topic,
            delivery_url: `${appUrl}/api/v1/webhooks/woocommerce/${topic.replace('.', '/')}`,
            secret: webhookSecret,
            status: 'active',
          });

          // Save webhook info to store
          store.webhooks.push({
            topic,
            woocommerceWebhookId: webhook.id.toString(),
            address: webhook.delivery_url,
            secret: webhookSecret,
            isActive: true,
            createdAt: new Date(),
          });

          results.push({
            topic,
            webhookId: webhook.id,
            success: true,
          });

          logger.info('WooCommerce webhook registered', {
            storeId,
            topic,
            webhookId: webhook.id,
          });
        } catch (error: any) {
          logger.error('Failed to register WooCommerce webhook', {
            storeId,
            topic,
            error: error.message,
          });

          results.push({
            topic,
            webhookId: 0,
            success: false,
            error: error.message,
          });
        }
      }

      // Save webhook registrations
      await store.save();

      const successCount = results.filter((r) => r.success).length;
      logger.info('WooCommerce webhook registration complete', {
        storeId,
        total: WEBHOOK_TOPICS.length,
        success: successCount,
        failed: WEBHOOK_TOPICS.length - successCount,
      });

      return results;
    } catch (error: any) {
      logger.error('Failed to register WooCommerce webhooks', {
        storeId,
        error: error.message,
      });

      throw new AppError(
        `Failed to register webhooks: ${error.message}`,
        'WOOCOMMERCE_WEBHOOK_REGISTRATION_FAILED',
        500
      );
    }
  }

  /**
   * Unregister all webhooks for a store
   * Called when disconnecting a store
   */
  static async unregisterWebhooks(storeId: string): Promise<void> {
    try {
      const store = await WooCommerceStore.findById(storeId);

      if (!store) {
        throw new AppError('WooCommerce store not found', 'WOOCOMMERCE_STORE_NOT_FOUND', 404);
      }

      const client = new WooCommerceClient({
        storeUrl: store.storeUrl,
        consumerKey: store.decryptConsumerKey(),
        consumerSecret: store.decryptConsumerSecret(),
      });

      // Delete each webhook
      for (const webhook of store.webhooks) {
        try {
          await client.delete(`/webhooks/${webhook.woocommerceWebhookId}`);

          logger.info('WooCommerce webhook unregistered', {
            storeId,
            topic: webhook.topic,
            webhookId: webhook.woocommerceWebhookId,
          });
        } catch (error: any) {
          logger.error('Failed to unregister WooCommerce webhook', {
            storeId,
            topic: webhook.topic,
            webhookId: webhook.woocommerceWebhookId,
            error: error.message,
          });
        }
      }

      // Clear webhooks array
      store.webhooks = [];
      await store.save();

      logger.info('WooCommerce webhooks unregistered', { storeId });
    } catch (error: any) {
      logger.error('Failed to unregister WooCommerce webhooks', {
        storeId,
        error: error.message,
      });

      throw new AppError(
        `Failed to unregister webhooks: ${error.message}`,
        'WOOCOMMERCE_WEBHOOK_UNREGISTRATION_FAILED',
        500
      );
    }
  }

  /**
   * Disconnect WooCommerce store
   * Deactivates store and unregisters webhooks
   */
  static async disconnectStore(storeId: string): Promise<void> {
    try {
      const store = await WooCommerceStore.findById(storeId);

      if (!store) {
        throw new AppError('WooCommerce store not found', 'WOOCOMMERCE_STORE_NOT_FOUND', 404);
      }

      // Unregister webhooks first
      await this.unregisterWebhooks(storeId);

      // Deactivate store
      store.isActive = false;
      store.uninstalledAt = new Date();
      await store.save();

      logger.info('WooCommerce store disconnected', { storeId });
    } catch (error: any) {
      logger.error('Failed to disconnect WooCommerce store', {
        storeId,
        error: error.message,
      });

      throw new AppError(
        `Failed to disconnect store: ${error.message}`,
        'WOOCOMMERCE_DISCONNECTION_FAILED',
        500
      );
    }
  }

  /**
   * Refresh connection to WooCommerce store
   * Updates store credentials and tests connection
   */
  static async refreshConnection(
    storeId: string,
    consumerKey: string,
    consumerSecret: string
  ): Promise<void> {
    try {
      const store = await WooCommerceStore.findById(storeId);

      if (!store) {
        throw new AppError('WooCommerce store not found', 'WOOCOMMERCE_STORE_NOT_FOUND', 404);
      }

      // Test new credentials
      await this.testConnection(store.storeUrl, consumerKey, consumerSecret);

      // Update credentials (will be encrypted in pre-save hook)
      store.consumerKey = consumerKey;
      store.consumerSecret = consumerSecret;
      await store.save();

      logger.info('WooCommerce connection refreshed', { storeId });
    } catch (error: any) {
      logger.error('Failed to refresh WooCommerce connection', {
        storeId,
        error: error.message,
      });

      throw new AppError(
        `Failed to refresh connection: ${error.message}`,
        'WOOCOMMERCE_REFRESH_FAILED',
        500
      );
    }
  }

  /**
   * Verify webhook signature
   * WooCommerce uses HMAC-SHA256 signature in request header
   */
  static verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const crypto = require('crypto');

    const hash = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('base64');

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'base64'),
      Buffer.from(hash, 'base64')
    );
  }

  /**
   * Generate webhook secret
   * Creates a random secret for webhook verification
   */
  private static generateWebhookSecret(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get store by URL and company
   * Helper method for finding stores
   */
  static async getStoreByUrl(companyId: string, storeUrl: string): Promise<any | null> {
    return WooCommerceStore.findOne({
      companyId,
      storeUrl,
      isActive: true,
    });
  }

  /**
   * Get all active stores for a company
   * Returns list of connected WooCommerce stores
   */
  static async getActiveStores(companyId: string): Promise<any[]> {
    return WooCommerceStore.find({
      companyId,
      isActive: true,
    }).select('-consumerKey -consumerSecret');
  }

  /**
   * Pause sync for a store
   * Temporarily stops automatic syncing
   */
  static async pauseSync(storeId: string): Promise<void> {
    try {
      const store = await WooCommerceStore.findById(storeId);

      if (!store) {
        throw new AppError('WooCommerce store not found', 'WOOCOMMERCE_STORE_NOT_FOUND', 404);
      }

      store.isPaused = true;
      await store.save();

      logger.info('WooCommerce sync paused', { storeId });
    } catch (error: any) {
      logger.error('Failed to pause WooCommerce sync', {
        storeId,
        error: error.message,
      });

      throw new AppError(
        `Failed to pause sync: ${error.message}`,
        'WOOCOMMERCE_PAUSE_FAILED',
        500
      );
    }
  }

  /**
   * Resume sync for a store
   * Resumes automatic syncing
   */
  static async resumeSync(storeId: string): Promise<void> {
    try {
      const store = await WooCommerceStore.findById(storeId);

      if (!store) {
        throw new AppError('WooCommerce store not found', 'WOOCOMMERCE_STORE_NOT_FOUND', 404);
      }

      store.isPaused = false;
      await store.save();

      logger.info('WooCommerce sync resumed', { storeId });
    } catch (error: any) {
      logger.error('Failed to resume WooCommerce sync', {
        storeId,
        error: error.message,
      });

      throw new AppError(
        `Failed to resume sync: ${error.message}`,
        'WOOCOMMERCE_RESUME_FAILED',
        500
      );
    }
  }
}
