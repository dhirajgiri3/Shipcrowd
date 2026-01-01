import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

/**
 * ShopifyStore Model
 *
 * Stores encrypted Shopify store credentials and sync configuration.
 * Supports multi-store setup per company with independent sync settings.
 */

export interface IShopifyStore extends Document {
  companyId: Schema.Types.ObjectId;

  // Store details
  shopDomain: string; // example.myshopify.com
  shopName: string;
  shopEmail: string;
  shopCountry: string;
  shopCurrency: string;
  shopPlan: string;

  // Authentication (encrypted)
  accessToken: string; // AES-256-CBC encrypted
  scope: string;

  // Installation
  installedAt: Date;
  isActive: boolean;
  isPaused: boolean;
  uninstalledAt?: Date;

  // Sync configuration
  syncConfig: {
    orderSync: {
      enabled: boolean;
      autoSync: boolean;
      syncInterval: number; // minutes
      lastSyncAt?: Date;
      syncStatus: 'IDLE' | 'SYNCING' | 'ERROR';
      errorCount: number;
      lastError?: string;
    };

    inventorySync: {
      enabled: boolean;
      autoSync: boolean;
      syncInterval: number; // minutes
      lastSyncAt?: Date;
      syncDirection: 'ONE_WAY' | 'TWO_WAY'; // Shipcrowd→Shopify or bidirectional
      errorCount: number;
      lastError?: string;
    };

    webhooksEnabled: boolean;
  };

  // Webhook tracking
  webhooks: Array<{
    topic: string;
    shopifyWebhookId: string;
    address: string;
    isActive: boolean;
    createdAt: Date;
  }>;

  // Statistics
  stats: {
    totalOrdersSynced: number;
    totalProductsMapped: number;
    totalInventorySyncs: number;
    lastOrderSyncAt?: Date;
    lastInventorySyncAt?: Date;
    lastWebhookAt?: Date;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Methods
  decryptAccessToken(): string;
  updateSyncStatus(type: 'order' | 'inventory', status: string, data?: any): Promise<void>;
  incrementSyncStats(type: 'order' | 'inventory', count: number): Promise<void>;
  recordWebhookReceived(): Promise<void>;
}

const ShopifyStoreSchema = new Schema<IShopifyStore>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },

    // Store details
    shopDomain: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9-]+\.myshopify\.com$/,
    },
    shopName: {
      type: String,
      required: true,
      trim: true,
    },
    shopEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    shopCountry: {
      type: String,
      required: true,
    },
    shopCurrency: {
      type: String,
      required: true,
      uppercase: true,
    },
    shopPlan: {
      type: String,
      default: 'basic',
    },

    // Authentication
    accessToken: {
      type: String,
      required: true,
      select: false, // Never select by default for security
    },
    scope: {
      type: String,
      required: true,
    },

    // Installation
    installedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isPaused: {
      type: Boolean,
      default: false,
    },
    uninstalledAt: {
      type: Date,
    },

    // Sync configuration
    syncConfig: {
      orderSync: {
        enabled: { type: Boolean, default: true },
        autoSync: { type: Boolean, default: true },
        syncInterval: { type: Number, default: 15 }, // 15 minutes
        lastSyncAt: { type: Date },
        syncStatus: {
          type: String,
          enum: ['IDLE', 'SYNCING', 'ERROR'],
          default: 'IDLE',
        },
        errorCount: { type: Number, default: 0 },
        lastError: { type: String },
      },

      inventorySync: {
        enabled: { type: Boolean, default: true },
        autoSync: { type: Boolean, default: false }, // Manual by default
        syncInterval: { type: Number, default: 60 }, // 60 minutes
        lastSyncAt: { type: Date },
        syncDirection: {
          type: String,
          enum: ['ONE_WAY', 'TWO_WAY'],
          default: 'ONE_WAY', // Shipcrowd → Shopify only
        },
        errorCount: { type: Number, default: 0 },
        lastError: { type: String },
      },

      webhooksEnabled: { type: Boolean, default: true },
    },

    // Webhook tracking
    webhooks: [
      {
        topic: { type: String, required: true },
        shopifyWebhookId: { type: String, required: true },
        address: { type: String, required: true },
        isActive: { type: Boolean, default: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Statistics
    stats: {
      totalOrdersSynced: { type: Number, default: 0 },
      totalProductsMapped: { type: Number, default: 0 },
      totalInventorySyncs: { type: Number, default: 0 },
      lastOrderSyncAt: { type: Date },
      lastInventorySyncAt: { type: Date },
      lastWebhookAt: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ShopifyStoreSchema.index({ companyId: 1, shopDomain: 1 }, { unique: true });
ShopifyStoreSchema.index({ companyId: 1, isActive: 1 });
ShopifyStoreSchema.index({ 'syncConfig.orderSync.syncStatus': 1 });

// Pre-save hook: Encrypt access token before saving
ShopifyStoreSchema.pre('save', function (next) {
  if (this.isModified('accessToken')) {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || '00000000000000000000000000000000', 'hex');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(this.accessToken, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Store IV prepended to encrypted data
    this.accessToken = iv.toString('hex') + ':' + encrypted;
  }
  next();
});

// Method: Decrypt access token
ShopifyStoreSchema.methods.decryptAccessToken = function (): string {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || '00000000000000000000000000000000', 'hex');

  const parts = this.accessToken.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

// Method: Update sync status
ShopifyStoreSchema.methods.updateSyncStatus = async function (
  type: 'order' | 'inventory',
  status: string,
  data?: any
): Promise<void> {
  if (type === 'order') {
    this.syncConfig.orderSync.syncStatus = status as any;
    this.syncConfig.orderSync.lastSyncAt = new Date();

    if (status === 'ERROR' && data?.error) {
      this.syncConfig.orderSync.errorCount += 1;
      this.syncConfig.orderSync.lastError = data.error;
    } else if (status === 'IDLE') {
      this.syncConfig.orderSync.errorCount = 0;
      this.syncConfig.orderSync.lastError = undefined;
    }
  } else if (type === 'inventory') {
    this.syncConfig.inventorySync.lastSyncAt = new Date();

    if (data?.error) {
      this.syncConfig.inventorySync.errorCount += 1;
      this.syncConfig.inventorySync.lastError = data.error;
    } else {
      this.syncConfig.inventorySync.errorCount = 0;
      this.syncConfig.inventorySync.lastError = undefined;
    }
  }

  await this.save();
};

// Method: Increment sync statistics
ShopifyStoreSchema.methods.incrementSyncStats = async function (
  type: 'order' | 'inventory',
  count: number
): Promise<void> {
  if (type === 'order') {
    this.stats.totalOrdersSynced += count;
    this.stats.lastOrderSyncAt = new Date();
  } else if (type === 'inventory') {
    this.stats.totalInventorySyncs += count;
    this.stats.lastInventorySyncAt = new Date();
  }

  await this.save();
};

// Method: Record webhook received
ShopifyStoreSchema.methods.recordWebhookReceived = async function (): Promise<void> {
  this.stats.lastWebhookAt = new Date();
  await this.save();
};

// Virtual: Get active webhooks count
ShopifyStoreSchema.virtual('activeWebhooksCount').get(function () {
  return this.webhooks.filter((w: any) => w.isActive).length;
});

export default mongoose.model<IShopifyStore>('ShopifyStore', ShopifyStoreSchema);
