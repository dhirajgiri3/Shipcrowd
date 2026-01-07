/**
 * Flipkart Oauth
 * 
 * Purpose: FlipkartOAuthService
 * 
 * DEPENDENCIES:
 * - Database Models, Error Handling, Logger
 * 
 * TESTING:
 * Unit Tests: tests/unit/services/.../{filename}.test.ts
 * Coverage: TBD
 * 
 * NOTE: This service needs comprehensive documentation.
 * See SERVICE_TEMPLATE.md for documentation standards.
 */

import { FlipkartStore } from '../../../../infrastructure/database/mongoose/models';
import FlipkartClient from '../../../../infrastructure/external/ecommerce/flipkart/flipkart.client';
import { AppError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Webhook topics to register
 * Flipkart webhook format: event.action
 */
const WEBHOOK_TOPICS = [
  'order.create',
  'order.approve',
  'order.ready_to_dispatch',
  'order.dispatch',
  'order.deliver',
  'order.cancel',
  'order.return',
  'inventory.update',
] as const;

export type FlipkartWebhookTopic = (typeof WEBHOOK_TOPICS)[number];

interface ConnectStoreParams {
  companyId: string;
  apiKey: string;
  apiSecret: string;
  sellerId: string;
  sellerName?: string;
  sellerEmail?: string;
  createdBy: string;
}

interface WebhookRegistrationResult {
  topic: FlipkartWebhookTopic;
  webhookId?: string;
  success: boolean;
  error?: string;
}

export default class FlipkartOAuthService {
  /**
   * Test connection to Flipkart API
   * Verifies credentials by making a test API call to get shipments
   */
  static async testConnection(
    apiKey: string,
    apiSecret: string,
    sellerId: string
  ): Promise<boolean> {
    try {
      const client = new FlipkartClient({
        apiKey,
        apiSecret,
        sellerId,
      });

      // Get access token to verify credentials
      await client.getAccessToken();

      // Test connection by making a shipments API call
      const connected = await client.testConnection();

      if (!connected) {
        throw new AppError('Failed to connect to Flipkart API', 'FLIPKART_CONNECTION_FAILED', 400);
      }

      logger.info('Flipkart connection test successful', { sellerId });
      return true;
    } catch (error: any) {
      logger.error('Flipkart connection test failed', {
        sellerId,
        error: error.message,
      });

      throw new AppError(
        `Failed to connect to Flipkart: ${error.message}`,
        'FLIPKART_CONNECTION_FAILED',
        400
      );
    }
  }

  /**
   * Connect Flipkart store
   * Saves store with encrypted credentials and registers webhooks
   */
  static async connectStore(params: ConnectStoreParams): Promise<any> {
    const { companyId, apiKey, apiSecret, sellerId, sellerName, sellerEmail, createdBy } = params;

    try {
      // 1. Test connection first
      await this.testConnection(apiKey, apiSecret, sellerId);

      // 2. Check if store already exists
      const existingStore = await FlipkartStore.findOne({
        companyId,
        sellerId,
      });

      if (existingStore && existingStore.isActive) {
        throw new AppError(
          'Flipkart store already connected',
          'FLIPKART_STORE_ALREADY_EXISTS',
          400
        );
      }

      // 3. Create or update store record with encrypted credentials
      const storeData = {
        companyId,
        createdBy,
        sellerId,
        sellerName: sellerName || `Flipkart Store - ${sellerId}`,
        sellerEmail,
        apiKey, // Will be encrypted in pre-save hook
        apiSecret, // Will be encrypted in pre-save hook
        apiVersion: 'v3',
        isActive: true,
        isPaused: false,
        installedAt: new Date(),
        syncStatus: 'active' as const,
        errorCount: 0,
        syncConfig: {
          orderSync: {
            enabled: true,
            autoSync: true,
            syncInterval: 15, // 15 minutes
            syncStatus: 'IDLE' as const,
            errorCount: 0,
          },
          inventorySync: {
            enabled: true,
            autoSync: false, // Manual inventory sync by default
            syncDirection: 'ONE_WAY' as const, // Shipcrowd → Flipkart
            errorCount: 0,
          },
          webhooksEnabled: true,
        },
        webhooks: [],
        stats: {
          totalOrdersSynced: 0,
          totalProductsMapped: 0,
          totalInventorySyncs: 0,
          webhooksReceived: 0,
        },
      };

      let store;
      if (existingStore) {
        // Reactivate existing store
        Object.assign(existingStore, storeData);
        existingStore.uninstalledAt = undefined;
        store = await existingStore.save();
      } else {
        // Create new store
        store = await FlipkartStore.create(storeData);
      }

      logger.info('Flipkart store connected successfully', {
        storeId: store._id,
        sellerId,
        companyId,
      });

      // 4. Register webhooks (non-blocking)
      this.registerWebhooks(String(store._id)).catch((error) => {
        logger.error('Failed to register Flipkart webhooks', {
          storeId: store._id,
          error: error.message,
        });
      });

      return store;
    } catch (error: any) {
      logger.error('Failed to connect Flipkart store', {
        sellerId,
        companyId,
        error: error.message,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        `Failed to connect Flipkart store: ${error.message}`,
        'FLIPKART_CONNECTION_FAILED',
        500
      );
    }
  }

  /**
   * Register webhooks for a Flipkart store
   * Creates webhooks for order and inventory events
   */
  static async registerWebhooks(storeId: string): Promise<WebhookRegistrationResult[]> {
    try {
      const store = await FlipkartStore.findById(storeId).select('+apiKey +apiSecret');

      if (!store) {
        throw new AppError('Flipkart store not found', 'FLIPKART_STORE_NOT_FOUND', 404);
      }

      const client = new FlipkartClient({
        apiKey: store.decryptApiKey(),
        apiSecret: store.decryptApiSecret(),
        sellerId: store.sellerId,
      });

      const appUrl = process.env.APP_URL || 'https://api.shipcrowd.com';
      const results: WebhookRegistrationResult[] = [];

      for (const topic of WEBHOOK_TOPICS) {
        try {
          // Generate webhook secret for this topic
          const webhookSecret = this.generateWebhookSecret();

          // Create webhook in Flipkart
          const webhookUrl = `${appUrl}/api/v1/webhooks/flipkart/${topic.replace('.', '/')}`;

          const response = await client.post<any>('/webhooks/v1/subscription', {
            event: topic,
            url: webhookUrl,
            secret: webhookSecret,
            status: 'active',
          });

          // Save webhook info to store
          store.webhooks.push({
            topic,
            flipkartWebhookId: response.id?.toString() || undefined,
            address: webhookUrl,
            secret: webhookSecret,
            isActive: true,
            createdAt: new Date(),
          });

          results.push({
            topic,
            webhookId: response.id?.toString(),
            success: true,
          });

          logger.info('Flipkart webhook registered', {
            storeId,
            topic,
            webhookId: response.id,
          });
        } catch (error: any) {
          logger.error('Failed to register Flipkart webhook', {
            storeId,
            topic,
            error: error.message,
          });

          results.push({
            topic,
            success: false,
            error: error.message,
          });
        }
      }

      // Save webhook registrations
      await store.save();

      const successCount = results.filter((r) => r.success).length;
      logger.info('Flipkart webhook registration complete', {
        storeId,
        total: WEBHOOK_TOPICS.length,
        success: successCount,
        failed: WEBHOOK_TOPICS.length - successCount,
      });

      return results;
    } catch (error: any) {
      logger.error('Failed to register Flipkart webhooks', {
        storeId,
        error: error.message,
      });

      throw new AppError(
        `Failed to register webhooks: ${error.message}`,
        'FLIPKART_WEBHOOK_REGISTRATION_FAILED',
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
      const store = await FlipkartStore.findById(storeId).select('+apiKey +apiSecret');

      if (!store) {
        throw new AppError('Flipkart store not found', 'FLIPKART_STORE_NOT_FOUND', 404);
      }

      const client = new FlipkartClient({
        apiKey: store.decryptApiKey(),
        apiSecret: store.decryptApiSecret(),
        sellerId: store.sellerId,
      });

      // Delete each webhook
      for (const webhook of store.webhooks) {
        try {
          if (webhook.flipkartWebhookId) {
            await client.delete(`/webhooks/v1/subscription/${webhook.flipkartWebhookId}`);

            logger.info('Flipkart webhook unregistered', {
              storeId,
              topic: webhook.topic,
              webhookId: webhook.flipkartWebhookId,
            });
          }
        } catch (error: any) {
          logger.error('Failed to unregister Flipkart webhook', {
            storeId,
            topic: webhook.topic,
            webhookId: webhook.flipkartWebhookId,
            error: error.message,
          });
        }
      }

      // Clear webhooks array
      store.webhooks = [];
      await store.save();

      logger.info('Flipkart webhooks unregistered', { storeId });
    } catch (error: any) {
      logger.error('Failed to unregister Flipkart webhooks', {
        storeId,
        error: error.message,
      });

      throw new AppError(
        `Failed to unregister webhooks: ${error.message}`,
        'FLIPKART_WEBHOOK_UNREGISTRATION_FAILED',
        500
      );
    }
  }

  /**
   * Disconnect Flipkart store
   * Deactivates store and unregisters webhooks
   */
  static async disconnectStore(storeId: string): Promise<void> {
    try {
      const store = await FlipkartStore.findById(storeId);

      if (!store) {
        throw new AppError('Flipkart store not found', 'FLIPKART_STORE_NOT_FOUND', 404);
      }

      // Unregister webhooks first
      await this.unregisterWebhooks(storeId);

      // Deactivate store
      store.isActive = false;
      store.syncStatus = 'paused';
      store.uninstalledAt = new Date();
      await store.save();

      logger.info('Flipkart store disconnected', { storeId });
    } catch (error: any) {
      logger.error('Failed to disconnect Flipkart store', {
        storeId,
        error: error.message,
      });

      throw new AppError(
        `Failed to disconnect store: ${error.message}`,
        'FLIPKART_DISCONNECTION_FAILED',
        500
      );
    }
  }

  /**
   * Refresh connection to Flipkart store
   * Updates store credentials and tests connection
   */
  static async refreshConnection(
    storeId: string,
    apiKey: string,
    apiSecret: string
  ): Promise<void> {
    try {
      const store = await FlipkartStore.findById(storeId);

      if (!store) {
        throw new AppError('Flipkart store not found', 'FLIPKART_STORE_NOT_FOUND', 404);
      }

      // Test new credentials
      await this.testConnection(apiKey, apiSecret, store.sellerId);

      // Update credentials (will be encrypted in pre-save hook)
      store.apiKey = apiKey;
      store.apiSecret = apiSecret;
      store.errorCount = 0;
      store.lastError = undefined;
      store.syncStatus = 'active';
      await store.save();

      logger.info('Flipkart connection refreshed', { storeId });
    } catch (error: any) {
      logger.error('Failed to refresh Flipkart connection', {
        storeId,
        error: error.message,
      });

      throw new AppError(
        `Failed to refresh connection: ${error.message}`,
        'FLIPKART_REFRESH_FAILED',
        500
      );
    }
  }

  /**
   * Verify webhook signature
   * Flipkart uses HMAC-SHA256 signature in request header
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
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'base64'),
        Buffer.from(hash, 'base64')
      );
    } catch (error) {
      // timingSafeEqual throws if lengths don't match
      return false;
    }
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
   * Get store by seller ID and company
   * Helper method for finding stores
   */
  static async getStoreBySellerId(companyId: string, sellerId: string): Promise<any | null> {
    return FlipkartStore.findOne({
      companyId,
      sellerId,
      isActive: true,
    });
  }

  /**
   * Get all active stores for a company
   * Returns list of connected Flipkart stores
   */
  static async getActiveStores(companyId: string): Promise<any[]> {
    return FlipkartStore.find({
      companyId,
      isActive: true,
    }).select('-apiKey -apiSecret -accessToken');
  }

  /**
   * Toggle pause/resume sync for a store
   * Temporarily stops or resumes automatic syncing
   */
  static async togglePauseSync(storeId: string, paused: boolean): Promise<void> {
    try {
      const store = await FlipkartStore.findById(storeId);

      if (!store) {
        throw new AppError('Flipkart store not found', 'FLIPKART_STORE_NOT_FOUND', 404);
      }

      store.isPaused = paused;
      store.syncStatus = paused ? 'paused' : 'active';
      await store.save();

      logger.info(`Flipkart sync ${paused ? 'paused' : 'resumed'}`, { storeId });
    } catch (error: any) {
      logger.error(`Failed to ${paused ? 'pause' : 'resume'} Flipkart sync`, {
        storeId,
        error: error.message,
      });

      throw new AppError(
        `Failed to ${paused ? 'pause' : 'resume'} sync: ${error.message}`,
        'FLIPKART_TOGGLE_SYNC_FAILED',
        500
      );
    }
  }
}
