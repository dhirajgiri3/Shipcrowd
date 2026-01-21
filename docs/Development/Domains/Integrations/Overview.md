# E-Commerce Integration Context Package

**Version:** 1.1
**Last Updated:** 2025-12-31
**Implementation Week:** Week 6-7 (Shopify ✅, WooCommerce ✅, Flipkart, Amazon)
**Dependencies:** Order model, Product model, OAuth infrastructure, Webhook system

---

## 1. OVERVIEW

### E-Commerce Platform Integration Strategy

Helix integrates with major e-commerce platforms to enable seamless order fulfillment automation. Merchants connect their online stores once, and Helix automatically pulls orders, creates shipments, and pushes tracking/fulfillment updates back to the platform.

**Supported Platforms (2025 Roadmap):**
1. **Shopify** (Week 6) ✅ - Market leader in India/Global
2. **WooCommerce** (Week 7) ✅ - Popular for WordPress-based stores
3. **Flipkart Seller Hub** (Week 7) - India's largest e-commerce marketplace
4. **Amazon SP-API** (Week 7) - Global e-commerce giant
5. **Future**: Magento, BigCommerce, Meesho, Custom platforms

### Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 E-COMMERCE INTEGRATION FLOW                  │
└─────────────────────────────────────────────────────────────┘

PLATFORM                 Helix                 COURIER
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
4. **Product Mapping**: SKU mapping between platform and Helix
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

  // Helix product identifiers
  HelixSKU: string;
  HelixProductName: string;

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
  HelixSKU: {
    type: String,
    required: true,
    index: true
  },
  HelixProductName: String,
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
ProductMappingSchema.index({ companyId: 1, HelixSKU: 1 });
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
    const baseUrl = process.env.APP_URL || 'https://api.Helix.com';

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

    // Create order in Helix
    await this.createOrderFromShopify(store, shopifyOrder);

    // Update sync stats
    await ShopifyStore.findByIdAndUpdate(store._id, {
      $inc: { 'stats.totalOrdersSynced': 1 },
      'stats.lastOrderSyncAt': new Date()
    });
  }

  /**
   * Create Helix order from Shopify order
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
          sku: mapping?.HelixSKU || item.sku,
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
    const baseUrl = process.env.APP_URL || 'https://api.Helix.com';

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

## 4. FLIPKART SELLER HUB INTEGRATION

### 4.1 Overview

Flipkart is India's largest e-commerce marketplace, accounting for nearly 48% of the Indian e-commerce market share. The Flipkart Seller Hub API enables third-party sellers to manage their catalog, orders, inventory, and logistics through programmatic access.

**API Version**: v3 (2024-2025)
**Authentication**: OAuth 2.0 Two-Legged (Client Credentials)
**Webhooks**: HTTPS delivery with HMAC SHA256 verification
**Rate Limiting**: 1000 requests per hour per seller

### 4.2 Database Schema

#### FlipkartStore Model

```typescript
// File: server/src/infrastructure/database/mongoose/models/FlipkartStore.ts

import mongoose, { Document, Schema } from 'mongoose';

export interface IFlipkartStore extends Document {
  companyId: mongoose.Types.ObjectId;

  // Store details
  sellerId: string;              // Flipkart Seller ID
  sellerName: string;
  sellerEmail: string;
  gstin?: string;                // GST Identification Number
  locationId: string;            // Primary fulfillment location

  // Authentication - OAuth 2.0 Two-Legged
  appId: string;                 // Flipkart App ID
  appSecret: string;             // Encrypted App Secret
  accessToken: string;           // Encrypted OAuth token
  tokenType: string;             // Bearer
  tokenExpiresAt: Date;          // Token expiry timestamp
  lastTokenRefresh?: Date;

  // Installation
  installedAt: Date;
  isActive: boolean;
  isPaused: boolean;

  // Sync configuration
  syncConfig: {
    orderSync: {
      enabled: boolean;
      autoSync: boolean;
      syncInterval: number;      // minutes (minimum 5)
      lastSyncAt?: Date;
      syncStatus: 'IDLE' | 'SYNCING' | 'ERROR';
      errorMessage?: string;
    };

    inventorySync: {
      enabled: boolean;
      autoSync: boolean;
      syncInterval: number;      // minutes (minimum 30)
      lastSyncAt?: Date;
      syncDirection: 'ONE_WAY' | 'TWO_WAY';
    };

    listingSync: {
      enabled: boolean;          // Product catalog sync
      autoSync: boolean;
      lastSyncAt?: Date;
    };

    webhooksEnabled: boolean;
    webhookTopics: string[];     // Subscribed webhook topics
    webhookSecret: string;       // For HMAC verification
  };

  // Rate limiting tracking
  rateLimiting: {
    requestsThisHour: number;
    hourStartedAt: Date;
    throttledUntil?: Date;
  };

  // Statistics
  stats: {
    totalOrdersSynced: number;
    totalProductsMapped: number;
    totalInventoryUpdates: number;
    lastOrderSyncAt?: Date;
    lastInventorySyncAt?: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}

const FlipkartStoreSchema = new Schema<IFlipkartStore>({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  sellerId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  sellerName: {
    type: String,
    required: true
  },
  sellerEmail: String,
  gstin: String,
  locationId: {
    type: String,
    required: true
  },
  appId: {
    type: String,
    required: true
  },
  appSecret: {
    type: String,
    required: true
    // Encrypted before saving
  },
  accessToken: {
    type: String,
    required: true
    // Encrypted before saving
  },
  tokenType: {
    type: String,
    default: 'Bearer'
  },
  tokenExpiresAt: {
    type: Date,
    required: true
  },
  lastTokenRefresh: Date,
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
      enabled: { type: Boolean, default: true },
      autoSync: { type: Boolean, default: false },
      syncInterval: { type: Number, default: 60 },
      lastSyncAt: Date,
      syncDirection: {
        type: String,
        enum: ['ONE_WAY', 'TWO_WAY'],
        default: 'ONE_WAY'
      }
    },
    listingSync: {
      enabled: { type: Boolean, default: false },
      autoSync: { type: Boolean, default: false },
      lastSyncAt: Date
    },
    webhooksEnabled: {
      type: Boolean,
      default: true
    },
    webhookTopics: [String],
    webhookSecret: String
  },
  rateLimiting: {
    requestsThisHour: { type: Number, default: 0 },
    hourStartedAt: { type: Date, default: Date.now },
    throttledUntil: Date
  },
  stats: {
    totalOrdersSynced: { type: Number, default: 0 },
    totalProductsMapped: { type: Number, default: 0 },
    totalInventoryUpdates: { type: Number, default: 0 },
    lastOrderSyncAt: Date,
    lastInventorySyncAt: Date
  }
}, { timestamps: true });

// Indexes
FlipkartStoreSchema.index({ companyId: 1, isActive: 1 });
FlipkartStoreSchema.index({ sellerId: 1 }, { unique: true });

const FlipkartStore = mongoose.model<IFlipkartStore>('FlipkartStore', FlipkartStoreSchema);
export default FlipkartStore;
```

### 4.3 Flipkart OAuth Service

```typescript
// File: server/src/core/application/services/integrations/FlipkartOAuthService.ts

import crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';
import FlipkartStore from '../../../../infrastructure/database/mongoose/models/FlipkartStore';

export interface FlipkartOAuthConfig {
  appId: string;
  appSecret: string;
  baseUrl: string;
}

export class FlipkartOAuthService {
  private config: FlipkartOAuthConfig;

  constructor() {
    this.config = {
      appId: process.env.FLIPKART_APP_ID!,
      appSecret: process.env.FLIPKART_APP_SECRET!,
      baseUrl: process.env.FLIPKART_API_BASE_URL || 'https://api.flipkart.net/sellers'
    };

    if (!this.config.appId || !this.config.appSecret) {
      throw new Error('Flipkart API credentials not configured');
    }
  }

  /**
   * Generate OAuth 2.0 access token (Two-Legged / Client Credentials)
   */
  async generateAccessToken(): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      const auth = Buffer.from(`${this.config.appId}:${this.config.appSecret}`).toString('base64');

      const response = await axios.post(
        `${this.config.baseUrl}/oauth/token`,
        'grant_type=client_credentials&scope=Seller_Api',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in || 86400 // 24 hours default
      };
    } catch (error: any) {
      console.error('Flipkart OAuth token generation failed:', error.response?.data || error.message);
      throw new Error('Failed to generate Flipkart access token');
    }
  }

  /**
   * Refresh access token if expired
   */
  async refreshTokenIfNeeded(store: IFlipkartStore): Promise<string> {
    const now = new Date();

    // Refresh if token expires in next 5 minutes
    if (store.tokenExpiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
      const { accessToken, expiresIn } = await this.generateAccessToken();
      const encryptedToken = this.encryptToken(accessToken);

      await FlipkartStore.findByIdAndUpdate(store._id, {
        accessToken: encryptedToken,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
        lastTokenRefresh: new Date()
      });

      return accessToken;
    }

    return this.decryptToken(store.accessToken);
  }

  /**
   * Create authenticated API client
   */
  async createApiClient(store: IFlipkartStore): Promise<AxiosInstance> {
    const accessToken = await this.refreshTokenIfNeeded(store);

    return axios.create({
      baseURL: `${this.config.baseUrl}/v3`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Verify webhook HMAC signature
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Register webhooks with Flipkart
   */
  async registerWebhooks(store: IFlipkartStore): Promise<void> {
    const apiClient = await this.createApiClient(store);
    const baseUrl = process.env.APP_URL || 'https://api.Helix.com';
    const webhookSecret = crypto.randomBytes(32).toString('hex');

    const webhookTopics = [
      'order.create',
      'order.approve',
      'order.ready_to_dispatch',
      'order.dispatch',
      'order.deliver',
      'order.cancel',
      'order.return',
      'inventory.update'
    ];

    const registeredTopics: string[] = [];

    for (const topic of webhookTopics) {
      try {
        await apiClient.post('/webhooks', {
          topic,
          url: `${baseUrl}/api/v1/webhooks/flipkart/${topic.replace('.', '/')}`,
          secret: webhookSecret
        });

        registeredTopics.push(topic);
        console.log(`Registered Flipkart webhook: ${topic}`);
      } catch (error) {
        console.error(`Failed to register Flipkart webhook ${topic}:`, error);
      }
    }

    // Update store with webhook configuration
    await FlipkartStore.findByIdAndUpdate(store._id, {
      'syncConfig.webhookTopics': registeredTopics,
      'syncConfig.webhookSecret': this.encryptToken(webhookSecret)
    });
  }

  /**
   * Encrypt token for storage
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
   * Decrypt token for API calls
   */
  private decryptToken(encryptedToken: string): string {
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
   * Check rate limit before API call
   */
  async checkRateLimit(store: IFlipkartStore): Promise<void> {
    const now = new Date();
    const hourStart = store.rateLimiting.hourStartedAt;
    const hoursDiff = (now.getTime() - hourStart.getTime()) / (1000 * 60 * 60);

    // Reset counter if new hour
    if (hoursDiff >= 1) {
      await FlipkartStore.findByIdAndUpdate(store._id, {
        'rateLimiting.requestsThisHour': 0,
        'rateLimiting.hourStartedAt': now
      });
    }

    // Check if throttled
    if (store.rateLimiting.throttledUntil && now < store.rateLimiting.throttledUntil) {
      throw new Error(`Rate limit exceeded. Throttled until ${store.rateLimiting.throttledUntil}`);
    }

    // Check limit (1000 req/hour)
    if (store.rateLimiting.requestsThisHour >= 1000) {
      const throttleUntil = new Date(hourStart.getTime() + 60 * 60 * 1000);
      await FlipkartStore.findByIdAndUpdate(store._id, {
        'rateLimiting.throttledUntil': throttleUntil
      });
      throw new Error(`Rate limit of 1000 requests/hour exceeded`);
    }

    // Increment counter
    await FlipkartStore.findByIdAndUpdate(store._id, {
      $inc: { 'rateLimiting.requestsThisHour': 1 }
    });
  }
}
```

### 4.4 Flipkart API Endpoints

**Order Management:**
- `GET /v3/orders` - Fetch orders (with filters)
- `GET /v3/orders/{orderId}` - Get order details
- `POST /v3/orders/{orderId}/dispatch` - Mark order as dispatched
- `POST /v3/orders/{orderId}/cancel` - Cancel order
- `POST /v3/orders/{orderId}/return` - Process return

**Inventory Management:**
- `GET /v3/inventory` - Fetch inventory levels
- `PUT /v3/inventory` - Update inventory (bulk)
- `POST /v3/inventory/sync` - Force inventory sync

**Listing Management:**
- `GET /v3/listings` - Fetch product listings
- `POST /v3/listings` - Create new listing
- `PUT /v3/listings/{listingId}` - Update listing

### 4.5 Webhook Topics

1. **order.create** - New order placed
2. **order.approve** - Order approved by Flipkart
3. **order.ready_to_dispatch** - Ready for pickup
4. **order.dispatch** - Order picked up
5. **order.deliver** - Successfully delivered
6. **order.cancel** - Order cancelled
7. **order.return** - Return initiated
8. **inventory.update** - Inventory level changed

---

## 5. AMAZON SP-API INTEGRATION

### 5.1 Overview

Amazon Selling Partner API (SP-API) is the modernized API suite replacing the legacy MWS API. It provides programmatic access to Amazon's selling services globally.

**API Version**: SP-API v2021 (Latest)
**Authentication**: LWA (Login with Amazon) OAuth + AWS Signature Version 4
**Notifications**: SQS-based (not HTTP webhooks)
**Rate Limiting**: Dynamic token bucket algorithm per endpoint
**Data Format**: JSON (REST) + XML (Feeds)

### 5.2 Database Schema

#### AmazonStore Model

```typescript
// File: server/src/infrastructure/database/mongoose/models/AmazonStore.ts

import mongoose, { Document, Schema } from 'mongoose';

export interface IAmazonStore extends Document {
  companyId: mongoose.Types.ObjectId;

  // Store details
  sellerId: string;              // Amazon Seller ID
  marketplaceId: string;         // e.g., A21TJRUUN4KGV (India)
  region: 'NA' | 'EU' | 'FE';    // North America, Europe, Far East
  countryCode: string;           // IN, US, UK, etc.
  sellerName: string;

  // LWA OAuth Authentication
  lwaClientId: string;
  lwaClientSecret: string;       // Encrypted
  lwaRefreshToken: string;       // Encrypted - Long-lived
  lwaAccessToken?: string;       // Encrypted - Short-lived
  lwaTokenExpiresAt?: Date;

  // AWS IAM Credentials (for Signature V4)
  awsAccessKeyId: string;        // Encrypted
  awsSecretAccessKey: string;    // Encrypted
  roleArn?: string;              // For cross-account access

  // SP-API Configuration
  spApiEndpoint: string;         // e.g., https://sellingpartnerapi-eu.amazon.com
  apiVersion: string;            // 2021-06-30

  // SQS Notification Queue
  sqsQueueUrl?: string;          // SQS queue for notifications
  sqsEnabled: boolean;
  notificationTypes: string[];   // Subscribed notification types

  // Installation
  installedAt: Date;
  isActive: boolean;
  isPaused: boolean;

  // Sync configuration
  syncConfig: {
    orderSync: {
      enabled: boolean;
      autoSync: boolean;
      syncInterval: number;
      lastSyncAt?: Date;
      syncStatus: 'IDLE' | 'SYNCING' | 'ERROR';
      orderStatuses: string[];   // Filter by status
      fulfillmentTypes: ('FBA' | 'MFN')[];  // FBA or Merchant Fulfilled
    };

    inventorySync: {
      enabled: boolean;
      autoSync: boolean;
      syncInterval: number;
      lastSyncAt?: Date;
      syncType: 'FBA' | 'MFN' | 'BOTH';
    };

    feedsEnabled: boolean;       // XML feed processing
  };

  // Rate limiting (per endpoint)
  rateLimits: Map<string, {
    requestsPerSecond: number;
    burst: number;
    tokensAvailable: number;
    lastRefill: Date;
  }>;

  // Statistics
  stats: {
    totalOrdersSynced: number;
    totalFBAOrders: number;
    totalMFNOrders: number;
    totalInventoryUpdates: number;
    totalFeedsSubmitted: number;
    lastOrderSyncAt?: Date;
    lastInventorySyncAt?: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}

const AmazonStoreSchema = new Schema<IAmazonStore>({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  sellerId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  marketplaceId: {
    type: String,
    required: true
  },
  region: {
    type: String,
    enum: ['NA', 'EU', 'FE'],
    required: true
  },
  countryCode: {
    type: String,
    required: true
  },
  sellerName: String,
  lwaClientId: {
    type: String,
    required: true
  },
  lwaClientSecret: {
    type: String,
    required: true
  },
  lwaRefreshToken: {
    type: String,
    required: true
  },
  lwaAccessToken: String,
  lwaTokenExpiresAt: Date,
  awsAccessKeyId: {
    type: String,
    required: true
  },
  awsSecretAccessKey: {
    type: String,
    required: true
  },
  roleArn: String,
  spApiEndpoint: {
    type: String,
    required: true
  },
  apiVersion: {
    type: String,
    default: '2021-06-30'
  },
  sqsQueueUrl: String,
  sqsEnabled: {
    type: Boolean,
    default: false
  },
  notificationTypes: [String],
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
      syncInterval: { type: Number, default: 15 },
      lastSyncAt: Date,
      syncStatus: {
        type: String,
        enum: ['IDLE', 'SYNCING', 'ERROR'],
        default: 'IDLE'
      },
      orderStatuses: [String],
      fulfillmentTypes: [String]
    },
    inventorySync: {
      enabled: { type: Boolean, default: true },
      autoSync: { type: Boolean, default: false },
      syncInterval: { type: Number, default: 60 },
      lastSyncAt: Date,
      syncType: {
        type: String,
        enum: ['FBA', 'MFN', 'BOTH'],
        default: 'BOTH'
      }
    },
    feedsEnabled: {
      type: Boolean,
      default: true
    }
  },
  rateLimits: {
    type: Map,
    of: new Schema({
      requestsPerSecond: Number,
      burst: Number,
      tokensAvailable: Number,
      lastRefill: Date
    })
  },
  stats: {
    totalOrdersSynced: { type: Number, default: 0 },
    totalFBAOrders: { type: Number, default: 0 },
    totalMFNOrders: { type: Number, default: 0 },
    totalInventoryUpdates: { type: Number, default: 0 },
    totalFeedsSubmitted: { type: Number, default: 0 },
    lastOrderSyncAt: Date,
    lastInventorySyncAt: Date
  }
}, { timestamps: true });

// Indexes
AmazonStoreSchema.index({ companyId: 1, isActive: 1 });
AmazonStoreSchema.index({ sellerId: 1 }, { unique: true });
AmazonStoreSchema.index({ marketplaceId: 1 });

const AmazonStore = mongoose.model<IAmazonStore>('AmazonStore', AmazonStoreSchema);
export default AmazonStore;
```

### 5.3 Amazon SP-API Service

```typescript
// File: server/src/core/application/services/integrations/AmazonSPAPIService.ts

import crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import AmazonStore from '../../../../infrastructure/database/mongoose/models/AmazonStore';

export class AmazonSPAPIService {
  /**
   * Refresh LWA access token
   */
  async refreshAccessToken(store: IAmazonStore): Promise<string> {
    try {
      const response = await axios.post(
        'https://api.amazon.com/auth/o2/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.decryptToken(store.lwaRefreshToken),
          client_id: store.lwaClientId,
          client_secret: this.decryptToken(store.lwaClientSecret)
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const accessToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 3600;

      // Update store with new token
      await AmazonStore.findByIdAndUpdate(store._id, {
        lwaAccessToken: this.encryptToken(accessToken),
        lwaTokenExpiresAt: new Date(Date.now() + expiresIn * 1000)
      });

      return accessToken;
    } catch (error: any) {
      console.error('Amazon LWA token refresh failed:', error.response?.data || error.message);
      throw new Error('Failed to refresh Amazon access token');
    }
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getAccessToken(store: IAmazonStore): Promise<string> {
    const now = new Date();

    // Refresh if token expires in next 5 minutes
    if (!store.lwaAccessToken || !store.lwaTokenExpiresAt ||
        store.lwaTokenExpiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
      return await this.refreshAccessToken(store);
    }

    return this.decryptToken(store.lwaAccessToken);
  }

  /**
   * Sign request with AWS Signature V4
   */
  async signRequest(
    store: IAmazonStore,
    method: string,
    path: string,
    queryParams: Record<string, string> = {},
    body?: any
  ): Promise<{ headers: Record<string, string>; url: string }> {
    const accessToken = await this.getAccessToken(store);
    const awsAccessKeyId = this.decryptToken(store.awsAccessKeyId);
    const awsSecretAccessKey = this.decryptToken(store.awsSecretAccessKey);

    const url = new URL(path, store.spApiEndpoint);
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const signer = new SignatureV4({
      service: 'execute-api',
      region: this.getRegionFromEndpoint(store.spApiEndpoint),
      credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey
      },
      sha256: Sha256
    });

    const request = {
      method,
      protocol: 'https:',
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'host': url.hostname,
        'x-amz-access-token': accessToken,
        'x-amz-date': new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''),
        'content-type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    };

    const signedRequest = await signer.sign(request);

    return {
      headers: signedRequest.headers as Record<string, string>,
      url: url.toString()
    };
  }

  /**
   * Create authenticated API client
   */
  async createApiClient(store: IAmazonStore): Promise<AxiosInstance> {
    const accessToken = await this.getAccessToken(store);

    return axios.create({
      baseURL: store.spApiEndpoint,
      headers: {
        'x-amz-access-token': accessToken,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Fetch orders with pagination
   */
  async fetchOrders(
    store: IAmazonStore,
    params: {
      createdAfter?: string;
      createdBefore?: string;
      orderStatuses?: string[];
      fulfillmentChannels?: string[];
      nextToken?: string;
    } = {}
  ): Promise<{ orders: any[]; nextToken?: string }> {
    const queryParams: Record<string, string> = {
      MarketplaceIds: store.marketplaceId
    };

    if (params.createdAfter) queryParams.CreatedAfter = params.createdAfter;
    if (params.createdBefore) queryParams.CreatedBefore = params.createdBefore;
    if (params.orderStatuses) queryParams.OrderStatuses = params.orderStatuses.join(',');
    if (params.fulfillmentChannels) queryParams.FulfillmentChannels = params.fulfillmentChannels.join(',');
    if (params.nextToken) queryParams.NextToken = params.nextToken;

    const { headers, url } = await this.signRequest(
      store,
      'GET',
      '/orders/v0/orders',
      queryParams
    );

    try {
      const response = await axios.get(url, { headers });

      return {
        orders: response.data.payload?.Orders || [],
        nextToken: response.data.payload?.NextToken
      };
    } catch (error: any) {
      console.error('Failed to fetch Amazon orders:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Submit inventory feed (XML format)
   */
  async submitInventoryFeed(store: IAmazonStore, inventoryXML: string): Promise<string> {
    const { headers, url } = await this.signRequest(
      store,
      'POST',
      '/feeds/2021-06-30/feeds',
      {},
      {
        feedType: 'POST_INVENTORY_AVAILABILITY_DATA',
        marketplaceIds: [store.marketplaceId],
        inputFeedDocumentId: await this.uploadFeedDocument(store, inventoryXML)
      }
    );

    try {
      const response = await axios.post(url, {}, { headers });
      return response.data.feedId;
    } catch (error: any) {
      console.error('Failed to submit inventory feed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Upload feed document
   */
  private async uploadFeedDocument(store: IAmazonStore, content: string): Promise<string> {
    // Step 1: Create feed document
    const { headers: createHeaders, url: createUrl } = await this.signRequest(
      store,
      'POST',
      '/feeds/2021-06-30/documents',
      {},
      { contentType: 'application/xml' }
    );

    const createResponse = await axios.post(createUrl, {}, { headers: createHeaders });
    const { feedDocumentId, url: uploadUrl } = createResponse.data;

    // Step 2: Upload content to S3
    await axios.put(uploadUrl, content, {
      headers: {
        'Content-Type': 'application/xml'
      }
    });

    return feedDocumentId;
  }

  /**
   * Setup SQS notifications
   */
  async setupNotifications(store: IAmazonStore, sqsQueueUrl: string): Promise<void> {
    const notificationTypes = [
      'ORDER_CHANGE',
      'LISTINGS_ITEM_STATUS_CHANGE',
      'LISTINGS_ITEM_ISSUES_CHANGE',
      'FBA_INVENTORY_AVAILABILITY_CHANGES'
    ];

    for (const notificationType of notificationTypes) {
      try {
        const { headers, url } = await this.signRequest(
          store,
          'POST',
          '/notifications/v1/subscriptions/' + notificationType,
          {},
          {
            payloadVersion: '1.0',
            destinationType: 'SQS',
            destinationUrl: sqsQueueUrl
          }
        );

        await axios.post(url, {}, { headers });
        console.log(`Subscribed to Amazon notification: ${notificationType}`);
      } catch (error) {
        console.error(`Failed to subscribe to ${notificationType}:`, error);
      }
    }

    // Update store
    await AmazonStore.findByIdAndUpdate(store._id, {
      sqsQueueUrl,
      sqsEnabled: true,
      notificationTypes
    });
  }

  /**
   * Get region from endpoint
   */
  private getRegionFromEndpoint(endpoint: string): string {
    if (endpoint.includes('-eu')) return 'eu-west-1';
    if (endpoint.includes('-fe')) return 'us-west-2';
    return 'us-east-1';
  }

  /**
   * Encrypt token
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
   * Decrypt token
   */
  private decryptToken(encryptedToken: string): string {
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
   * Token bucket rate limiting
   */
  async checkRateLimit(store: IAmazonStore, endpoint: string): Promise<void> {
    const rateLimitConfig = store.rateLimits?.get(endpoint);

    if (!rateLimitConfig) {
      // Initialize rate limit for endpoint (example: 5 req/sec, burst 10)
      store.rateLimits?.set(endpoint, {
        requestsPerSecond: 5,
        burst: 10,
        tokensAvailable: 10,
        lastRefill: new Date()
      });
      await store.save();
      return;
    }

    const now = new Date();
    const timeSinceRefill = (now.getTime() - rateLimitConfig.lastRefill.getTime()) / 1000;
    const tokensToAdd = Math.floor(timeSinceRefill * rateLimitConfig.requestsPerSecond);

    // Refill tokens
    rateLimitConfig.tokensAvailable = Math.min(
      rateLimitConfig.tokensAvailable + tokensToAdd,
      rateLimitConfig.burst
    );
    rateLimitConfig.lastRefill = now;

    // Check if tokens available
    if (rateLimitConfig.tokensAvailable < 1) {
      throw new Error(`Rate limit exceeded for endpoint: ${endpoint}`);
    }

    // Consume token
    rateLimitConfig.tokensAvailable -= 1;

    await store.save();
  }
}
```

### 5.4 Amazon SP-API Key Endpoints

**Orders API:**
- `GET /orders/v0/orders` - List orders (with NextToken pagination)
- `GET /orders/v0/orders/{orderId}` - Get order details
- `GET /orders/v0/orders/{orderId}/items` - Get order items

**Feeds API (XML):**
- `POST /feeds/2021-06-30/feeds` - Submit feed (inventory, pricing)
- `GET /feeds/2021-06-30/feeds/{feedId}` - Get feed status
- `GET /feeds/2021-06-30/documents/{feedDocumentId}` - Download feed result

**Fulfillment Inventory API:**
- `GET /fba/inventory/v1/summaries` - FBA inventory levels
- `GET /fba/inventory/v1/items/{sku}` - FBA item details

**Notifications API:**
- `POST /notifications/v1/subscriptions/{notificationType}` - Subscribe to SQS notifications
- `GET /notifications/v1/subscriptions/{notificationType}` - Get subscription details
- `DELETE /notifications/v1/subscriptions/{notificationType}` - Unsubscribe

### 5.5 FBA vs MFN Order Handling

**FBA (Fulfilled by Amazon):**
- Orders automatically fulfilled by Amazon
- Inventory tracked by Amazon
- Tracking provided by Amazon
- Helix syncs for reporting only

**MFN (Merchant Fulfilled Network):**
- Merchant handles fulfillment
- Helix creates shipments
- Helix pushes tracking to Amazon
- Full lifecycle management

---

## 6. WEEK 6-7 IMPLEMENTATION ROADMAP

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
- [ ] Map Shopify orders to Helix orders
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

### Week 7: WooCommerce, Flipkart & Amazon Integration

#### WooCommerce Implementation

**Day 1: Models + Authentication (8 hours)**
- [ ] Create WooCommerceStore model
- [ ] Implement WooCommerceService
- [ ] Add API key authentication
- [ ] Test connection verification
- [ ] Write unit tests

**Day 2: Order Sync (8 hours)**
- [ ] Implement WooCommerceOrderSyncService
- [ ] Create webhook handlers
- [ ] Map WooCommerce orders to Helix
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
SHOPIFY_REDIRECT_URI=https://api.Helix.com/api/v1/integrations/shopify/auth/callback

# WooCommerce Configuration
# (Keys are per-store, stored encrypted in database)

# Flipkart Configuration
FLIPKART_APP_ID=your_flipkart_app_id
FLIPKART_APP_SECRET=your_flipkart_app_secret
FLIPKART_API_BASE_URL=https://api.flipkart.net/sellers

# Amazon SP-API Configuration
# (Per-store credentials stored encrypted in database)
# AWS SDK dependencies: @aws-sdk/signature-v4, @aws-crypto/sha256-js

# Encryption Key (for storing access tokens)
ENCRYPTION_KEY=your_64_char_hex_encryption_key

# App URL
APP_URL=https://api.Helix.com
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

### Flipkart Best Practices

1. **OAuth Token Management**: Refresh tokens proactively before expiry
2. **Rate Limiting**: Track 1000 req/hour limit, implement backoff on throttling
3. **Webhook HMAC Verification**: Always verify signatures for security
4. **Order Lifecycle**: Handle all 8 webhook topics for complete order tracking
5. **GST Compliance**: Include GSTIN for Indian marketplace requirements
6. **Listing Management**: Keep product catalog in sync for accurate inventory

### Amazon SP-API Best Practices

1. **Dual Authentication**: Implement both LWA OAuth and AWS Signature V4
2. **SQS Notifications**: Use SQS queue instead of HTTP webhooks for reliability
3. **Token Bucket Rate Limiting**: Implement dynamic rate limiting per endpoint
4. **NextToken Pagination**: Handle large datasets with cursor-based pagination
5. **XML Feeds**: Use XML format for inventory and pricing updates
6. **FBA vs MFN**: Distinguish fulfillment types for proper order handling
7. **Region-Specific Endpoints**: Use correct endpoint based on marketplace region
8. **Error Handling**: Implement comprehensive retry logic with exponential backoff

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
