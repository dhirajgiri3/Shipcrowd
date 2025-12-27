# E-Commerce Integration Context Package

**Version:** 1.0
**Last Updated:** 2025-12-27
**Implementation Week:** Week 6-7
**Dependencies:** Order model, Product model, OAuth infrastructure, Webhook system

---

## 1. OVERVIEW

### E-Commerce Platform Integration Strategy

Shipcrowd integrates with major e-commerce platforms to enable seamless order fulfillment automation. Merchants connect their online stores once, and Shipcrowd automatically pulls orders, creates shipments, and pushes tracking/fulfillment updates back to the platform.

**Supported Platforms (2025 Roadmap):**
1. **Shopify** (Week 6) - Market leader in India/Global
2. **WooCommerce** (Week 7) - Popular for WordPress-based stores
3. **Future**: Magento, BigCommerce, Custom platforms

### Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 E-COMMERCE INTEGRATION FLOW                  │
└─────────────────────────────────────────────────────────────┘

PLATFORM                 SHIPCROWD                 COURIER
┌─────────┐             ┌─────────┐              ┌─────────┐
│ Shopify │────────────▶│  Order  │─────────────▶│Velocity │
│  Store  │  Webhook    │ Service │  API Call    │Shipfast │
└─────────┘             └─────────┘              └─────────┘
     │                       │                        │
     │                       ▼                        │
     │                  ┌─────────┐                  │
     │                  │Shipment │                  │
     │                  │ Service │                  │
     │                  └─────────┘                  │
     │                       │                        │
     │    Fulfillment        │       Tracking         │
     │◀──────────────────────┴────────────────────────┘
     │     Update                  Webhook
     │
     ▼
┌─────────┐
│Customer │
│Notified │
└─────────┘
```

### Key Features

1. **OAuth Authentication**: Secure app installation with token-based access
2. **Bi-Directional Sync**: Orders flow in, fulfillment/tracking flows out
3. **Webhook-Based**: Real-time order notifications, no polling required
4. **Product Mapping**: SKU mapping between platform and Shipcrowd
5. **Inventory Sync**: Stock level updates pushed to platform
6. **Multi-Store Support**: One company can connect multiple stores

---

## 2. SHOPIFY INTEGRATION

### 2.1 Overview

Shopify is the leading e-commerce platform globally with strong presence in India. As of 2025, Shopify recommends using GraphQL Admin API for all new integrations.

**API Version**: 2024-01 (REST) transitioning to GraphQL
**Authentication**: OAuth 2.0
**Webhooks**: HTTPS delivery with HMAC SHA256 verification

### 2.2 Database Schema

#### ShopifyStore Model

```typescript
// File: server/src/infrastructure/database/mongoose/models/ShopifyStore.ts

import mongoose, { Document, Schema } from 'mongoose';

export interface IShopifyStore extends Document {
  companyId: mongoose.Types.ObjectId;

  // Store details
  shopDomain: string;        // example.myshopify.com
  shopName: string;
  shopEmail: string;
  shopCountry: string;
  shopCurrency: string;

  // Authentication
  accessToken: string;       // Encrypted token
  scope: string;             // Permissions granted

  // Installation
  installedAt: Date;
  isActive: boolean;
  isPaused: boolean;

  // Sync configuration
  syncConfig: {
    orderSync: {
      enabled: boolean;
      autoSync: boolean;
      syncInterval: number;  // minutes
      lastSyncAt?: Date;
      syncStatus: 'IDLE' | 'SYNCING' | 'ERROR';
      errorMessage?: string;
    };

    inventorySync: {
      enabled: boolean;
      autoSync: boolean;
      syncInterval: number;
      lastSyncAt?: Date;
      syncDirection: 'ONE_WAY' | 'TWO_WAY';
    };

    webhooksEnabled: boolean;
    webhookTopics: string[]; // ['orders/create', 'orders/updated', ...]
  };

  // Statistics
  stats: {
    totalOrdersSynced: number;
    totalProductsMapped: number;
    lastOrderSyncAt?: Date;
    lastInventorySyncAt?: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}

const ShopifyStoreSchema = new Schema<IShopifyStore>({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  shopDomain: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  shopName: {
    type: String,
    required: true
  },
  shopEmail: String,
  shopCountry: String,
  shopCurrency: String,
  accessToken: {
    type: String,
    required: true
    // Encrypted before saving
  },
  scope: {
    type: String,
    required: true
  },
  installedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPaused: {
    type: Boolean,
    default: false
  },
  syncConfig: {
    orderSync: {
      enabled: { type: Boolean, default: true },
      autoSync: { type: Boolean, default: true },
      syncInterval: { type: Number, default: 5 },
      lastSyncAt: Date,
      syncStatus: {
        type: String,
        enum: ['IDLE', 'SYNCING', 'ERROR'],
        default: 'IDLE'
      },
      errorMessage: String
    },
    inventorySync: {
      enabled: { type: Boolean, default: false },
      autoSync: { type: Boolean, default: false },
      syncInterval: { type: Number, default: 30 },
      lastSyncAt: Date,
      syncDirection: {
        type: String,
        enum: ['ONE_WAY', 'TWO_WAY'],
        default: 'ONE_WAY'
      }
    },
    webhooksEnabled: {
      type: Boolean,
      default: true
    },
    webhookTopics: [String]
  },
  stats: {
    totalOrdersSynced: { type: Number, default: 0 },
    totalProductsMapped: { type: Number, default: 0 },
    lastOrderSyncAt: Date,
    lastInventorySyncAt: Date
  }
}, { timestamps: true });

// Indexes
ShopifyStoreSchema.index({ companyId: 1, isActive: 1 });
ShopifyStoreSchema.index({ shopDomain: 1 }, { unique: true });

const ShopifyStore = mongoose.model<IShopifyStore>('ShopifyStore', ShopifyStoreSchema);
export default ShopifyStore;
```

#### ProductMapping Model

```typescript
// File: server/src/infrastructure/database/mongoose/models/ProductMapping.ts

export interface IProductMapping extends Document {
  companyId: mongoose.Types.ObjectId;
  platformType: 'SHOPIFY' | 'WOOCOMMERCE';
  platformStoreId: mongoose.Types.ObjectId;

  // Platform product identifiers
  platformProductId: string;      // Shopify: product.id, WooCommerce: product.id
  platformVariantId?: string;     // For products with variants
  platformSKU: string;
  platformTitle: string;
  platformBarcode?: string;

  // Shipcrowd product identifiers
  shipcrowdSKU: string;
  shipcrowdProductName: string;

  // Mapping metadata
  mappingType: 'AUTO' | 'MANUAL';
  mappedBy?: mongoose.Types.ObjectId; // User who created mapping
  mappedAt: Date;
  confidence?: number;                // For auto-mapping (0-100)

  // Sync settings
  syncInventory: boolean;
  syncPrice: boolean;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductMappingSchema = new Schema<IProductMapping>({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  platformType: {
    type: String,
    enum: ['SHOPIFY', 'WOOCOMMERCE'],
    required: true
  },
  platformStoreId: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: 'platformType' // Dynamic reference
  },
  platformProductId: {
    type: String,
    required: true
  },
  platformVariantId: String,
  platformSKU: {
    type: String,
    required: true,
    index: true
  },
  platformTitle: String,
  platformBarcode: String,
  shipcrowdSKU: {
    type: String,
    required: true,
    index: true
  },
  shipcrowdProductName: String,
  mappingType: {
    type: String,
    enum: ['AUTO', 'MANUAL'],
    default: 'MANUAL'
  },
  mappedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  mappedAt: {
    type: Date,
    default: Date.now
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100
  },
  syncInventory: {
    type: Boolean,
    default: true
  },
  syncPrice: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Indexes for quick lookups
ProductMappingSchema.index({ companyId: 1, platformSKU: 1 });
ProductMappingSchema.index({ companyId: 1, shipcrowdSKU: 1 });
ProductMappingSchema.index({ platformStoreId: 1, platformProductId: 1 });

const ProductMapping = mongoose.model<IProductMapping>('ProductMapping', ProductMappingSchema);
export default ProductMapping;
```

---

### 2.3 Shopify OAuth Service

```typescript
// File: server/src/core/application/services/integrations/ShopifyOAuthService.ts

import crypto from 'crypto';
import axios from 'axios';
import ShopifyStore from '../../../../infrastructure/database/mongoose/models/ShopifyStore';

export interface ShopifyOAuthConfig {
  apiKey: string;
  apiSecret: string;
  redirectUri: string;
  scopes: string[];
}

export class ShopifyOAuthService {
  private config: ShopifyOAuthConfig;

  constructor() {
    this.config = {
      apiKey: process.env.SHOPIFY_API_KEY!,
      apiSecret: process.env.SHOPIFY_API_SECRET!,
      redirectUri: process.env.SHOPIFY_REDIRECT_URI!,
      scopes: [
        'read_orders',
        'write_orders',
        'read_products',
        'write_products',
        'read_inventory',
        'write_inventory',
        'read_fulfillments',
        'write_fulfillments'
      ]
    };

    if (!this.config.apiKey || !this.config.apiSecret) {
      throw new Error('Shopify API credentials not configured');
    }
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(shop: string, state: string): string {
    const shopDomain = this.normalizeShopDomain(shop);
    const scopeString = this.config.scopes.join(',');

    return `https://${shopDomain}/admin/oauth/authorize?` +
           `client_id=${this.config.apiKey}` +
           `&scope=${scopeString}` +
           `&redirect_uri=${encodeURIComponent(this.config.redirectUri)}` +
           `&state=${state}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(shop: string, code: string): Promise<string> {
    const shopDomain = this.normalizeShopDomain(shop);

    try {
      const response = await axios.post(
        `https://${shopDomain}/admin/oauth/access_token`,
        {
          client_id: this.config.apiKey,
          client_secret: this.config.apiSecret,
          code
        }
      );

      return response.data.access_token;
    } catch (error) {
      console.error('Token exchange failed:', error);
      throw new Error('Failed to exchange code for access token');
    }
  }

  /**
   * Verify HMAC signature from Shopify (for app install/callback)
   */
  verifyHmac(query: Record<string, string>): boolean {
    const { hmac, ...params } = query;

    if (!hmac) return false;

    // Build message from sorted parameters
    const message = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');

    const expectedHmac = crypto
      .createHmac('sha256', this.config.apiSecret)
      .update(message)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(hmac),
      Buffer.from(expectedHmac)
    );
  }

  /**
   * Get shop details using access token
   */
  async getShopDetails(shop: string, accessToken: string): Promise<any> {
    const shopDomain = this.normalizeShopDomain(shop);

    try {
      const response = await axios.get(
        `https://${shopDomain}/admin/api/2024-01/shop.json`,
        {
          headers: {
            'X-Shopify-Access-Token': accessToken
          }
        }
      );

      return response.data.shop;
    } catch (error) {
      console.error('Failed to fetch shop details:', error);
      throw new Error('Failed to fetch shop details');
    }
  }

  /**
   * Install store and register webhooks
   */
  async installStore(companyId: string, shop: string, accessToken: string): Promise<IShopifyStore> {
    // Get shop details
    const shopDetails = await this.getShopDetails(shop, accessToken);

    // Encrypt access token
    const encryptedToken = this.encryptToken(accessToken);

    // Create store record
    const store = await ShopifyStore.create({
      companyId,
      shopDomain: this.normalizeShopDomain(shop),
      shopName: shopDetails.name,
      shopEmail: shopDetails.email,
      shopCountry: shopDetails.country,
      shopCurrency: shopDetails.currency,
      accessToken: encryptedToken,
      scope: this.config.scopes.join(','),
      installedAt: new Date(),
      isActive: true,
      syncConfig: {
        orderSync: {
          enabled: true,
          autoSync: true,
          syncInterval: 5,
          syncStatus: 'IDLE'
        },
        inventorySync: {
          enabled: false,
          autoSync: false,
          syncInterval: 30,
          syncDirection: 'ONE_WAY'
        },
        webhooksEnabled: true,
        webhookTopics: []
      },
      stats: {
        totalOrdersSynced: 0,
        totalProductsMapped: 0
      }
    });

    // Register webhooks
    await this.registerWebhooks(shop, accessToken, store._id.toString());

    return store;
  }

  /**
   * Register Shopify webhooks
   */
  private async registerWebhooks(shop: string, accessToken: string, storeId: string): Promise<void> {
    const shopDomain = this.normalizeShopDomain(shop);
    const baseUrl = process.env.APP_URL || 'https://api.shipcrowd.com';

    const webhooks = [
      {
        topic: 'orders/create',
        address: `${baseUrl}/api/v1/webhooks/shopify/orders/create`,
        format: 'json'
      },
      {
        topic: 'orders/updated',
        address: `${baseUrl}/api/v1/webhooks/shopify/orders/updated`,
        format: 'json'
      },
      {
        topic: 'orders/cancelled',
        address: `${baseUrl}/api/v1/webhooks/shopify/orders/cancelled`,
        format: 'json'
      },
      {
        topic: 'products/update',
        address: `${baseUrl}/api/v1/webhooks/shopify/products/update`,
        format: 'json'
      }
    ];

    const registeredTopics: string[] = [];

    for (const webhook of webhooks) {
      try {
        await axios.post(
          `https://${shopDomain}/admin/api/2024-01/webhooks.json`,
          { webhook },
          {
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json'
            }
          }
        );

        registeredTopics.push(webhook.topic);
        console.log(`Registered webhook: ${webhook.topic}`);
      } catch (error) {
        console.error(`Failed to register webhook ${webhook.topic}:`, error);
      }
    }

    // Update store with registered webhook topics
    await ShopifyStore.findByIdAndUpdate(storeId, {
      'syncConfig.webhookTopics': registeredTopics
    });
  }

  /**
   * Encrypt access token for storage
   */
  private encryptToken(token: string): string {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt access token for API calls
   */
  decryptToken(encryptedToken: string): string {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

    const [ivHex, encrypted] = encryptedToken.split(':');
    const iv = Buffer.from(ivHex, 'hex');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Normalize shop domain
   */
  private normalizeShopDomain(shop: string): string {
    return shop
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .toLowerCase();
  }
}
```

---

### 2.4 Shopify Order Sync Service

```typescript
// File: server/src/core/application/services/integrations/ShopifyOrderSyncService.ts

import axios from 'axios';
import ShopifyStore from '../../../../infrastructure/database/mongoose/models/ShopifyStore';
import Order from '../../../../infrastructure/database/mongoose/models/Order';
import ProductMapping from '../../../../infrastructure/database/mongoose/models/ProductMapping';
import { ShopifyOAuthService } from './ShopifyOAuthService';

interface ShopifyOrder {
  id: number;
  order_number: number;
  email: string;
  created_at: string;
  updated_at: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  line_items: ShopifyLineItem[];
  shipping_address: ShopifyAddress;
  billing_address: ShopifyAddress;
  customer: ShopifyCustomer;
}

interface ShopifyLineItem {
  id: number;
  product_id: number;
  variant_id: number;
  title: string;
  quantity: number;
  sku: string;
  price: string;
}

interface ShopifyAddress {
  first_name: string;
  last_name: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  country: string;
  zip: string;
  phone: string;
}

interface ShopifyCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
}

export class ShopifyOrderSyncService {
  private oauthService: ShopifyOAuthService;

  constructor() {
    this.oauthService = new ShopifyOAuthService();
  }

  /**
   * Process order from Shopify webhook
   */
  async processOrderWebhook(shopDomain: string, shopifyOrder: ShopifyOrder): Promise<void> {
    // Find store
    const store = await ShopifyStore.findOne({ shopDomain, isActive: true });

    if (!store) {
      console.error(`Store not found: ${shopDomain}`);
      return;
    }

    // Check if order already exists
    const existingOrder = await Order.findOne({
      externalOrderId: shopifyOrder.id.toString(),
      externalPlatform: 'SHOPIFY'
    });

    if (existingOrder) {
      console.log(`Order already exists: ${shopifyOrder.order_number}`);
      return;
    }

    // Create order in Shipcrowd
    await this.createOrderFromShopify(store, shopifyOrder);

    // Update sync stats
    await ShopifyStore.findByIdAndUpdate(store._id, {
      $inc: { 'stats.totalOrdersSynced': 1 },
      'stats.lastOrderSyncAt': new Date()
    });
  }

  /**
   * Create Shipcrowd order from Shopify order
   */
  private async createOrderFromShopify(store: IShopifyStore, shopifyOrder: ShopifyOrder): Promise<void> {
    // Map line items
    const orderItems = await Promise.all(
      shopifyOrder.line_items.map(async (item) => {
        // Try to find product mapping
        const mapping = await ProductMapping.findOne({
          companyId: store.companyId,
          platformStoreId: store._id,
          platformSKU: item.sku,
          isActive: true
        });

        return {
          productId: item.product_id.toString(),
          variantId: item.variant_id.toString(),
          productName: item.title,
          sku: mapping?.shipcrowdSKU || item.sku,
          quantity: item.quantity,
          unitPrice: parseFloat(item.price),
          totalPrice: parseFloat(item.price) * item.quantity
        };
      })
    );

    // Create order
    await Order.create({
      companyId: store.companyId,
      orderNumber: `SH-${shopifyOrder.order_number}`,
      externalOrderId: shopifyOrder.id.toString(),
      externalPlatform: 'SHOPIFY',
      externalOrderNumber: shopifyOrder.order_number.toString(),

      // Customer details
      customerName: `${shopifyOrder.shipping_address.first_name} ${shopifyOrder.shipping_address.last_name}`,
      customerEmail: shopifyOrder.customer.email,
      customerPhone: shopifyOrder.shipping_address.phone || shopifyOrder.customer.phone,

      // Shipping address
      shippingAddress: {
        addressLine1: shopifyOrder.shipping_address.address1,
        addressLine2: shopifyOrder.shipping_address.address2,
        city: shopifyOrder.shipping_address.city,
        state: shopifyOrder.shipping_address.province,
        country: shopifyOrder.shipping_address.country,
        postalCode: shopifyOrder.shipping_address.zip
      },

      // Billing address
      billingAddress: {
        addressLine1: shopifyOrder.billing_address.address1,
        addressLine2: shopifyOrder.billing_address.address2,
        city: shopifyOrder.billing_address.city,
        state: shopifyOrder.billing_address.province,
        country: shopifyOrder.billing_address.country,
        postalCode: shopifyOrder.billing_address.zip
      },

      // Order items
      items: orderItems,

      // Pricing
      subtotal: parseFloat(shopifyOrder.subtotal_price),
      tax: parseFloat(shopifyOrder.total_tax),
      total: parseFloat(shopifyOrder.total_price),
      currency: shopifyOrder.currency,

      // Payment
      paymentMethod: shopifyOrder.financial_status === 'paid' ? 'PREPAID' : 'COD',
      paymentStatus: shopifyOrder.financial_status === 'paid' ? 'PAID' : 'PENDING',

      // Status
      orderStatus: 'PENDING',
      fulfillmentStatus: shopifyOrder.fulfillment_status || 'UNFULFILLED',

      // Metadata
      orderDate: new Date(shopifyOrder.created_at),
      metadata: {
        shopifyOrderId: shopifyOrder.id,
        shopifyOrderNumber: shopifyOrder.order_number,
        shopifyStoreId: store._id
      }
    });

    console.log(`Created order from Shopify: ${shopifyOrder.order_number}`);
  }

  /**
   * Update Shopify order with fulfillment details
   */
  async updateShopifyFulfillment(orderId: string, trackingNumber: string, carrier: string): Promise<void> {
    const order = await Order.findById(orderId);

    if (!order || order.externalPlatform !== 'SHOPIFY') {
      throw new Error('Order not found or not from Shopify');
    }

    const store = await ShopifyStore.findById(order.metadata?.shopifyStoreId);

    if (!store) {
      throw new Error('Shopify store not found');
    }

    const accessToken = this.oauthService.decryptToken(store.accessToken);

    try {
      // Create fulfillment in Shopify
      await axios.post(
        `https://${store.shopDomain}/admin/api/2024-01/orders/${order.externalOrderId}/fulfillments.json`,
        {
          fulfillment: {
            location_id: null,
            tracking_number: trackingNumber,
            tracking_company: carrier,
            notify_customer: true
          }
        },
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`Updated Shopify fulfillment for order: ${order.orderNumber}`);
    } catch (error) {
      console.error('Failed to update Shopify fulfillment:', error);
      throw error;
    }
  }
}
```

---

## 3. WOOCOMMERCE INTEGRATION

### 3.1 Overview

WooCommerce is the most popular WordPress e-commerce plugin, powering millions of online stores globally.

**API Version**: REST API v3
**Authentication**: API Keys (Consumer Key + Secret) with Basic Auth
**Webhooks**: HTTPS delivery with HMAC SHA256 verification

### 3.2 WooCommerce Store Model

```typescript
// File: server/src/infrastructure/database/mongoose/models/WooCommerceStore.ts

export interface IWooCommerceStore extends Document {
  companyId: mongoose.Types.ObjectId;

  // Store details
  siteUrl: string;           // https://example.com
  storeName: string;
  storeEmail: string;
  wpVersion: string;
  wooVersion: string;

  // Authentication
  consumerKey: string;       // Encrypted
  consumerSecret: string;    // Encrypted
  webhookSecret?: string;    // For webhook verification

  // Installation
  installedAt: Date;
  isActive: boolean;
  isPaused: boolean;

  // Sync configuration (same structure as Shopify)
  syncConfig: {
    orderSync: {
      enabled: boolean;
      autoSync: boolean;
      syncInterval: number;
      lastSyncAt?: Date;
      syncStatus: 'IDLE' | 'SYNCING' | 'ERROR';
    };
    inventorySync: {
      enabled: boolean;
      autoSync: boolean;
      syncInterval: number;
      lastSyncAt?: Date;
      syncDirection: 'ONE_WAY' | 'TWO_WAY';
    };
    webhooksEnabled: boolean;
  };

  // Statistics
  stats: {
    totalOrdersSynced: number;
    totalProductsMapped: number;
    lastOrderSyncAt?: Date;
    lastInventorySyncAt?: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

### 3.3 WooCommerce Service

```typescript
// File: server/src/core/application/services/integrations/WooCommerceService.ts

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import WooCommerceStore from '../../../../infrastructure/database/mongoose/models/WooCommerceStore';

export class WooCommerceService {
  /**
   * Create authenticated WooCommerce API client
   */
  createApiClient(store: IWooCommerceStore): AxiosInstance {
    const consumerKey = this.decryptKey(store.consumerKey);
    const consumerSecret = this.decryptKey(store.consumerSecret);

    return axios.create({
      baseURL: `${store.siteUrl}/wp-json/wc/v3`,
      auth: {
        username: consumerKey,
        password: consumerSecret
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Test connection to WooCommerce store
   */
  async testConnection(siteUrl: string, consumerKey: string, consumerSecret: string): Promise<boolean> {
    try {
      const response = await axios.get(`${siteUrl}/wp-json/wc/v3/system_status`, {
        auth: {
          username: consumerKey,
          password: consumerSecret
        }
      });

      return response.status === 200;
    } catch (error) {
      console.error('WooCommerce connection test failed:', error);
      return false;
    }
  }

  /**
   * Register webhooks
   */
  async registerWebhooks(store: IWooCommerceStore): Promise<void> {
    const apiClient = this.createApiClient(store);
    const baseUrl = process.env.APP_URL || 'https://api.shipcrowd.com';

    const webhooks = [
      {
        name: 'Order created',
        topic: 'order.created',
        delivery_url: `${baseUrl}/api/v1/webhooks/woocommerce/orders/create`
      },
      {
        name: 'Order updated',
        topic: 'order.updated',
        delivery_url: `${baseUrl}/api/v1/webhooks/woocommerce/orders/update`
      },
      {
        name: 'Product updated',
        topic: 'product.updated',
        delivery_url: `${baseUrl}/api/v1/webhooks/woocommerce/products/update`
      }
    ];

    for (const webhook of webhooks) {
      try {
        await apiClient.post('/webhooks', webhook);
        console.log(`Registered WooCommerce webhook: ${webhook.topic}`);
      } catch (error) {
        console.error(`Failed to register webhook ${webhook.topic}:`, error);
      }
    }
  }

  /**
   * Fetch orders from WooCommerce
   */
  async fetchOrders(store: IWooCommerceStore, params: {
    page?: number;
    per_page?: number;
    status?: string;
    after?: string;
  } = {}): Promise<any[]> {
    const apiClient = this.createApiClient(store);

    try {
      const response = await apiClient.get('/orders', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch WooCommerce orders:', error);
      throw error;
    }
  }

  /**
   * Update order status in WooCommerce
   */
  async updateOrderStatus(store: IWooCommerceStore, orderId: string, status: string): Promise<void> {
    const apiClient = this.createApiClient(store);

    try {
      await apiClient.put(`/orders/${orderId}`, { status });
      console.log(`Updated WooCommerce order ${orderId} to status: ${status}`);
    } catch (error) {
      console.error('Failed to update WooCommerce order status:', error);
      throw error;
    }
  }

  /**
   * Add tracking info to order note
   */
  async addTrackingNote(store: IWooCommerceStore, orderId: string, trackingNumber: string, carrier: string): Promise<void> {
    const apiClient = this.createApiClient(store);

    try {
      await apiClient.post(`/orders/${orderId}/notes`, {
        note: `Shipment created. Tracking Number: ${trackingNumber}, Carrier: ${carrier}`,
        customer_note: true
      });

      console.log(`Added tracking note to WooCommerce order: ${orderId}`);
    } catch (error) {
      console.error('Failed to add tracking note:', error);
      throw error;
    }
  }

  /**
   * Encrypt API key for storage
   */
  private encryptKey(key: string): string {
    const algorithm = 'aes-256-cbc';
    const encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, encryptionKey, iv);
    let encrypted = cipher.update(key, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt API key for use
   */
  private decryptKey(encryptedKey: string): string {
    const algorithm = 'aes-256-cbc';
    const encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

    const [ivHex, encrypted] = encryptedKey.split(':');
    const iv = Buffer.from(ivHex, 'hex');

    const decipher = crypto.createDecipheriv(algorithm, encryptionKey, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
```

---

## 4. WEBHOOK HANDLERS

### Shopify Webhook Controller

```typescript
// File: server/src/presentation/http/controllers/webhooks/shopify.webhook.controller.ts

import { Request, Response } from 'express';
import crypto from 'crypto';
import { ShopifyOrderSyncService } from '../../../../core/application/services/integrations/ShopifyOrderSyncService';

export class ShopifyWebhookController {
  private orderSyncService: ShopifyOrderSyncService;

  constructor() {
    this.orderSyncService = new ShopifyOrderSyncService();
  }

  /**
   * Verify Shopify webhook signature
   */
  private verifyWebhook(req: Request): boolean {
    const hmac = req.headers['x-shopify-hmac-sha256'] as string;
    const body = JSON.stringify(req.body);
    const secret = process.env.SHOPIFY_API_SECRET!;

    const hash = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('base64');

    return crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(hmac)
    );
  }

  /**
   * Handle order created webhook
   */
  handleOrderCreate = async (req: Request, res: Response): Promise<void> => {
    try {
      // Verify webhook
      if (!this.verifyWebhook(req)) {
        res.status(401).json({ error: 'Invalid webhook signature' });
        return;
      }

      const shopDomain = req.headers['x-shopify-shop-domain'] as string;
      const shopifyOrder = req.body;

      // Process order asynchronously
      this.orderSyncService.processOrderWebhook(shopDomain, shopifyOrder)
        .catch(error => console.error('Order processing failed:', error));

      // Respond immediately
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Webhook handling error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  };

  /**
   * Handle order updated webhook
   */
  handleOrderUpdate = async (req: Request, res: Response): Promise<void> => {
    // Similar to handleOrderCreate
    res.status(200).json({ success: true });
  };

  /**
   * Handle order cancelled webhook
   */
  handleOrderCancel = async (req: Request, res: Response): Promise<void> => {
    // Update order status to cancelled
    res.status(200).json({ success: true });
  };
}
```

---

## 5. WEEK 6-7 IMPLEMENTATION ROADMAP

### Week 6: Shopify Integration

**Day 1: Models + OAuth (8 hours)**
- [ ] Create ShopifyStore model
- [ ] Create ProductMapping model
- [ ] Implement ShopifyOAuthService
- [ ] Create OAuth controller and routes
- [ ] Test OAuth flow

**Day 2: Order Sync (8 hours)**
- [ ] Implement ShopifyOrderSyncService
- [ ] Create webhook handler for orders/create
- [ ] Map Shopify orders to Shipcrowd orders
- [ ] Handle product mapping
- [ ] Write unit tests

**Day 3: Fulfillment Updates (7 hours)**
- [ ] Implement updateShopifyFulfillment()
- [ ] Integrate with shipment creation
- [ ] Send tracking updates to Shopify
- [ ] Test fulfillment flow
- [ ] Write integration tests

**Day 4: Inventory Sync (7 hours)**
- [ ] Implement inventory sync service
- [ ] Push stock levels to Shopify
- [ ] Handle variant inventory
- [ ] Add rate limiting
- [ ] Test sync reliability

**Day 5: Testing + Documentation (6 hours)**
- [ ] End-to-end integration testing
- [ ] Create Shopify app setup guide
- [ ] Document webhook configuration
- [ ] Test with real Shopify store
- [ ] Fix bugs and polish

---

### Week 7: WooCommerce Integration

**Day 1: Models + Authentication (8 hours)**
- [ ] Create WooCommerceStore model
- [ ] Implement WooCommerceService
- [ ] Add API key authentication
- [ ] Test connection verification
- [ ] Write unit tests

**Day 2: Order Sync (8 hours)**
- [ ] Implement WooCommerceOrderSyncService
- [ ] Create webhook handlers
- [ ] Map WooCommerce orders to Shipcrowd
- [ ] Handle product mapping
- [ ] Test order sync

**Day 3: Order Updates (7 hours)**
- [ ] Implement order status updates
- [ ] Add tracking notes to orders
- [ ] Send customer notifications
- [ ] Test update flow
- [ ] Write integration tests

**Day 4: Webhook Management (7 hours)**
- [ ] Implement webhook registration
- [ ] Add webhook verification
- [ ] Handle webhook retries
- [ ] Test webhook reliability
- [ ] Add logging and monitoring

**Day 5: Testing + Documentation (6 hours)**
- [ ] End-to-end WooCommerce testing
- [ ] Create setup documentation
- [ ] Test with real WooCommerce store
- [ ] Performance testing
- [ ] Bug fixes and polish

---

## 6. API ENDPOINTS

### Shopify Integration Routes

```typescript
// File: server/src/presentation/http/routes/v1/integrations/shopify.routes.ts

import { Router } from 'express';
import { ShopifyController } from '../../../controllers/integrations/shopify.controller';
import { ShopifyWebhookController } from '../../../controllers/webhooks/shopify.webhook.controller';
import { authenticate } from '../../../middlewares/auth.middleware';

const router = Router();
const shopifyController = new ShopifyController();
const webhookController = new ShopifyWebhookController();

// OAuth flow (requires auth)
router.use('/auth', authenticate);
router.get('/auth/install', shopifyController.initiateInstall);
router.get('/auth/callback', shopifyController.handleCallback);

// Store management (requires auth)
router.use(authenticate);
router.get('/stores', shopifyController.getStores);
router.get('/stores/:storeId', shopifyController.getStore);
router.post('/stores/:storeId/pause', shopifyController.pauseStore);
router.post('/stores/:storeId/resume', shopifyController.resumeStore);
router.delete('/stores/:storeId', shopifyController.disconnectStore);

// Product mapping (requires auth)
router.get('/stores/:storeId/mappings', shopifyController.getProductMappings);
router.post('/stores/:storeId/mappings', shopifyController.createProductMapping);
router.delete('/mappings/:mappingId', shopifyController.deleteProductMapping);

// Manual sync triggers (requires auth)
router.post('/stores/:storeId/sync/orders', shopifyController.syncOrders);
router.post('/stores/:storeId/sync/inventory', shopifyController.syncInventory);

// Webhooks (no auth - uses signature verification)
router.post('/webhooks/orders/create', webhookController.handleOrderCreate);
router.post('/webhooks/orders/updated', webhookController.handleOrderUpdate);
router.post('/webhooks/orders/cancelled', webhookController.handleOrderCancel);
router.post('/webhooks/products/update', webhookController.handleProductUpdate);

export default router;
```

---

## 7. ENVIRONMENT VARIABLES

Add to `.env`:

```bash
# Shopify Configuration
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_REDIRECT_URI=https://api.shipcrowd.com/api/v1/integrations/shopify/auth/callback

# WooCommerce Configuration
# (Keys are per-store, stored encrypted in database)

# Encryption Key (for storing access tokens)
ENCRYPTION_KEY=your_64_char_hex_encryption_key

# App URL
APP_URL=https://api.shipcrowd.com
```

---

## 8. BEST PRACTICES & SECURITY

### Shopify Best Practices

1. **Use GraphQL API**: Transitioning from REST to GraphQL for better performance
2. **Webhook + Scheduled Sync**: Hybrid approach for reliability
3. **Rate Limiting**: Monitor `X-Shopify-Shop-Api-Call-Limit` header
4. **Pagination**: Use cursor-based pagination for large datasets
5. **Idempotency**: Use webhook IDs to prevent duplicate processing

### WooCommerce Best Practices

1. **HTTPS Only**: Always use HTTPS for API calls
2. **Least Privilege**: Request only required permissions
3. **Webhook Verification**: Always verify HMAC signatures
4. **Error Handling**: Implement retry logic with exponential backoff
5. **Batch Operations**: Use batch endpoints for bulk updates

### Security Checklist

- [ ] Encrypt all access tokens before storage
- [ ] Use environment variables for API credentials
- [ ] Verify webhook signatures (timing-safe comparison)
- [ ] Implement rate limiting on webhook endpoints
- [ ] Use HTTPS for all webhook URLs
- [ ] Validate and sanitize all external data
- [ ] Log all integration errors for monitoring
- [ ] Implement idempotency for webhook processing

---

## 9. SOURCES & REFERENCES

This context package was created based on official platform documentation and industry best practices for e-commerce integrations in 2025:

**Shopify:**
- [Shopify Order Sync: Best Practices for Webhooks & API Limits](https://www.codersy.com/blog/shopify-apps-and-integrations/shopify-order-sync-best-practices)
- [Best practices for webhooks - Shopify Dev](https://shopify.dev/docs/apps/build/webhooks/best-practices)
- [About webhooks - Shopify Dev](https://shopify.dev/docs/apps/build/webhooks)
- [Shopify API: How to Easily Develop an Integration in 2025](https://api2cart.com/api-technology/brief-intro-shopify-api/)

**WooCommerce:**
- [WooCommerce REST API Documentation](https://woocommerce.github.io/woocommerce-rest-api-docs/)
- [WooCommerce REST API: Complete Developer's Guide for 2025](https://brainspate.com/blog/woocommerce-rest-api-developer-guide/)
- [WooCommerce REST API: Guide to Integrate in 2025](https://ecommerce.folio3.com/blog/woocommerce-rest-api/)

---

**Next Steps:** Proceed with Week 6 Shopify implementation, starting with OAuth flow and order sync. This e-commerce integration will enable merchants to fully automate their order fulfillment workflow.
