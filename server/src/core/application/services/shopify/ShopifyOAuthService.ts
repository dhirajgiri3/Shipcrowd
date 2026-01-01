import crypto from 'crypto';
import ShopifyStore from '../../../../infrastructure/database/mongoose/models/ShopifyStore';
import ShopifyClient from '../../../../infrastructure/external/shopify/ShopifyClient';
import { AppError } from '../../../../shared/errors/AppError';
import winston from 'winston';

/**
 * ShopifyOAuthService
 *
 * Handles Shopify OAuth 2.0 authentication flow, store installation,
 * webhook registration, and connection management.
 *
 * Security Features:
 * - HMAC verification for OAuth callbacks
 * - State parameter for CSRF protection
 * - Access token encryption before storage
 * - Constant-time comparison for HMAC
 */

interface InstallUrlParams {
  shop: string;
  companyId: string;
  redirectUri?: string;
}

interface CallbackParams {
  shop: string;
  code: string;
  hmac: string;
  state: string;
  timestamp: string;
  companyId: string;
}

interface WebhookRegistration {
  topic: string;
  address: string;
}

export class ShopifyOAuthService {
  private static logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
  });

  // Shopify OAuth scopes required
  private static readonly REQUIRED_SCOPES = [
    'read_orders',
    'write_orders',
    'read_products',
    'write_products',
    'write_inventory',
    'read_fulfillments',
    'write_fulfillments',
    'read_locations',
    'read_shipping',
  ];

  // Webhook topics to register on installation
  private static readonly WEBHOOK_TOPICS = [
    'orders/create',
    'orders/updated',
    'orders/cancelled',
    'orders/fulfilled',
    'products/update',
    'inventory_levels/update',
    'app/uninstalled',
    'shop/update',
  ];

  /**
   * Generate Shopify OAuth installation URL
   *
   * @param params - Installation parameters
   * @returns OAuth installation URL
   */
  static generateInstallUrl(params: InstallUrlParams): string {
    const { shop, companyId, redirectUri } = params;

    // Validate shop domain
    if (!shop.match(/^[a-z0-9-]+\.myshopify\.com$/)) {
      throw new AppError('Invalid shop domain format', 'INVALID_SHOP_DOMAIN', 400);
    }

    const apiKey = process.env.SHOPIFY_API_KEY;
    const scopes = this.REQUIRED_SCOPES.join(',');
    const redirect = redirectUri || `${process.env.APP_URL}/api/v1/integrations/shopify/callback`;

    // Generate state for CSRF protection
    const state = this.generateState(companyId);

    const installUrl = `https://${shop}/admin/oauth/authorize?` +
      `client_id=${apiKey}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `redirect_uri=${encodeURIComponent(redirect)}&` +
      `state=${state}`;

    this.logger.info('Generated Shopify install URL', {
      shop,
      companyId,
      scopes: this.REQUIRED_SCOPES.length,
    });

    return installUrl;
  }

  /**
   * Generate state parameter for CSRF protection
   *
   * Format: base64(companyId:timestamp:randomBytes)
   */
  private static generateState(companyId: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString('hex');
    const state = `${companyId}:${timestamp}:${random}`;
    return Buffer.from(state).toString('base64');
  }

  /**
   * Decode and validate state parameter
   *
   * @param state - Base64 encoded state
   * @returns Company ID if valid
   */
  private static validateState(state: string): string {
    try {
      const decoded = Buffer.from(state, 'base64').toString('utf8');
      const [companyId, timestamp, random] = decoded.split(':');

      // Check state is not too old (10 minutes)
      const stateAge = Date.now() - parseInt(timestamp);
      if (stateAge > 10 * 60 * 1000) {
        throw new AppError('OAuth state expired', 'OAUTH_STATE_EXPIRED', 400);
      }

      return companyId;
    } catch (error) {
      throw new AppError('Invalid OAuth state parameter', 'INVALID_OAUTH_STATE', 400);
    }
  }

  /**
   * Verify HMAC signature from Shopify OAuth callback
   *
   * Uses constant-time comparison to prevent timing attacks.
   *
   * @param query - Query parameters from callback
   * @param hmac - HMAC signature to verify
   * @returns True if HMAC is valid
   */
  static verifyHmac(query: Record<string, any>, hmac: string): boolean {
    const secret = process.env.SHOPIFY_API_SECRET!;

    // Remove hmac and signature from params
    const { hmac: _hmac, signature: _signature, ...params } = query;

    // Sort params and create message
    const message = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join('&');

    // Calculate HMAC
    const hash = crypto
      .createHmac('sha256', secret)
      .update(message, 'utf8')
      .digest('hex');

    // Constant-time comparison
    try {
      return crypto.timingSafeEqual(
        Buffer.from(hmac, 'hex'),
        Buffer.from(hash, 'hex')
      );
    } catch (error) {
      // timingSafeEqual throws if lengths don't match
      return false;
    }
  }

  /**
   * Handle OAuth callback and exchange code for access token
   *
   * @param params - Callback parameters
   * @returns ShopifyStore document
   */
  static async handleCallback(params: CallbackParams) {
    const { shop, code, hmac, state, timestamp } = params;

    // Validate HMAC
    const queryParams = { shop, code, state, timestamp };
    if (!this.verifyHmac(queryParams, hmac)) {
      this.logger.error('HMAC verification failed', { shop });
      throw new AppError('Invalid HMAC signature', 'INVALID_HMAC', 403);
    }

    // Validate state and extract company ID
    const companyId = this.validateState(state);

    // Exchange code for access token
    const accessToken = await this.exchangeCodeForToken(shop, code);

    // Install store and register webhooks
    const store = await this.installStore({
      shop,
      accessToken,
      companyId,
    });

    this.logger.info('Shopify OAuth callback completed', {
      shop,
      companyId,
      storeId: store._id,
    });

    return store;
  }

  /**
   * Exchange authorization code for access token
   *
   * @param shop - Shop domain
   * @param code - Authorization code
   * @returns Access token
   */
  private static async exchangeCodeForToken(shop: string, code: string): Promise<string> {
    const apiKey = process.env.SHOPIFY_API_KEY!;
    const apiSecret = process.env.SHOPIFY_API_SECRET!;

    const axios = require('axios');
    const response = await axios.post(
      `https://${shop}/admin/oauth/access_token`,
      {
        client_id: apiKey,
        client_secret: apiSecret,
        code,
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.data.access_token) {
      throw new AppError('Failed to obtain access token', 'ACCESS_TOKEN_ERROR', 500);
    }

    this.logger.debug('Access token obtained', { shop });
    return response.data.access_token;
  }

  /**
   * Install Shopify store and register webhooks
   *
   * @param data - Installation data
   * @returns ShopifyStore document
   */
  static async installStore(data: {
    shop: string;
    accessToken: string;
    companyId: string;
  }) {
    const { shop, accessToken, companyId } = data;

    // Get shop information
    const client = new ShopifyClient({
      shopDomain: shop,
      accessToken,
    });

    const shopInfo = await client.getShopInfo();

    // Check if store already exists
    let store = await ShopifyStore.findOne({
      companyId,
      shopDomain: shop,
    });

    if (store) {
      // Update existing store
      store.accessToken = accessToken; // Will be encrypted by pre-save hook
      store.shopName = shopInfo.name;
      store.shopEmail = shopInfo.email;
      store.shopCountry = shopInfo.country_code;
      store.shopCurrency = shopInfo.currency;
      store.shopPlan = shopInfo.plan_name;
      store.scope = this.REQUIRED_SCOPES.join(',');
      store.isActive = true;
      store.isPaused = false;
      store.uninstalledAt = undefined;

      this.logger.info('Updating existing Shopify store', {
        storeId: store._id,
        shop,
      });
    } else {
      // Create new store
      store = new ShopifyStore({
        companyId,
        shopDomain: shop,
        shopName: shopInfo.name,
        shopEmail: shopInfo.email,
        shopCountry: shopInfo.country_code,
        shopCurrency: shopInfo.currency,
        shopPlan: shopInfo.plan_name,
        accessToken, // Will be encrypted by pre-save hook
        scope: this.REQUIRED_SCOPES.join(','),
        installedAt: new Date(),
        isActive: true,
        isPaused: false,
      });

      this.logger.info('Creating new Shopify store', {
        shop,
        companyId,
      });
    }

    await store.save();

    // Register webhooks
    await this.registerWebhooks(String(store._id));

    return store;
  }

  /**
   * Register all required webhooks
   *
   * @param storeId - ShopifyStore ID
   */
  static async registerWebhooks(storeId: string): Promise<void> {
    const store = await ShopifyStore.findById(storeId).select('+accessToken');
    if (!store) {
      throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
    }

    const client = new ShopifyClient({
      shopDomain: store.shopDomain,
      accessToken: store.decryptAccessToken(),
    });

    const webhookBaseUrl = `${process.env.APP_URL}/api/v1/webhooks/shopify`;
    const registeredWebhooks: any[] = [];

    for (const topic of this.WEBHOOK_TOPICS) {
      try {
        const address = `${webhookBaseUrl}/${topic.replace('/', '/')}`;

        // Register webhook via REST API
        const response = await client.post<{ webhook: any }>('/webhooks.json', {
          webhook: {
            topic,
            address,
            format: 'json',
          },
        });

        const webhook = response.webhook;

        registeredWebhooks.push({
          topic,
          shopifyWebhookId: webhook.id.toString(),
          address,
          isActive: true,
          createdAt: new Date(),
        });

        this.logger.debug('Registered webhook', {
          storeId,
          topic,
          webhookId: webhook.id,
        });
      } catch (error: any) {
        // Check if webhook already exists
        if (error.response?.data?.errors?.address?.includes('already taken')) {
          this.logger.warn('Webhook already registered', { topic });
        } else {
          this.logger.error('Failed to register webhook', {
            topic,
            error: error.message,
          });
        }
      }
    }

    // Update store with registered webhooks
    store.webhooks = registeredWebhooks;
    await store.save();

    this.logger.info('Webhooks registered', {
      storeId,
      count: registeredWebhooks.length,
      topics: registeredWebhooks.map((w) => w.topic),
    });
  }

  /**
   * Unregister all webhooks and disconnect store
   *
   * @param storeId - ShopifyStore ID
   */
  static async disconnectStore(storeId: string): Promise<void> {
    const store = await ShopifyStore.findById(storeId).select('+accessToken');
    if (!store) {
      throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
    }

    const client = new ShopifyClient({
      shopDomain: store.shopDomain,
      accessToken: store.decryptAccessToken(),
    });

    // Unregister all webhooks
    for (const webhook of store.webhooks) {
      try {
        await client.delete(`/webhooks/${webhook.shopifyWebhookId}.json`);
        this.logger.debug('Unregistered webhook', {
          storeId,
          topic: webhook.topic,
          webhookId: webhook.shopifyWebhookId,
        });
      } catch (error: any) {
        this.logger.warn('Failed to unregister webhook', {
          topic: webhook.topic,
          error: error.message,
        });
      }
    }

    // Deactivate store
    store.isActive = false;
    store.uninstalledAt = new Date();
    store.webhooks = [];
    await store.save();

    this.logger.info('Store disconnected', {
      storeId,
      shop: store.shopDomain,
    });
  }

  /**
   * Refresh connection and verify token validity
   *
   * @param storeId - ShopifyStore ID
   * @returns True if connection is valid
   */
  static async refreshConnection(storeId: string): Promise<boolean> {
    const store = await ShopifyStore.findById(storeId).select('+accessToken');
    if (!store) {
      throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
    }

    const client = new ShopifyClient({
      shopDomain: store.shopDomain,
      accessToken: store.decryptAccessToken(),
    });

    const isValid = await client.testConnection();

    if (!isValid) {
      store.isActive = false;
      await store.save();
      this.logger.warn('Store connection invalid', { storeId });
    } else {
      this.logger.info('Store connection valid', { storeId });
    }

    return isValid;
  }

  /**
   * Get all active stores for a company
   *
   * @param companyId - Company ID
   * @returns Active stores
   */
  static async getActiveStores(companyId: string) {
    return ShopifyStore.find({
      companyId,
      isActive: true,
    }).select('-accessToken'); // Never return access token
  }

  /**
   * Pause/unpause sync for a store
   *
   * @param storeId - ShopifyStore ID
   * @param paused - Pause status
   */
  static async togglePauseSync(storeId: string, paused: boolean): Promise<void> {
    const store = await ShopifyStore.findById(storeId);
    if (!store) {
      throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
    }

    store.isPaused = paused;
    await store.save();

    this.logger.info(`Store sync ${paused ? 'paused' : 'resumed'}`, { storeId });
  }
}

export default ShopifyOAuthService;
