import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';
import { DEFAULT_STORE_SETTINGS, DEFAULT_SYNC_CONFIG } from '../../../../../../config/integration.defaults';

/**
 * WooCommerceStore Model
 *
 * Stores WooCommerce store credentials and sync configuration.
 * Credentials are encrypted using AES-256-CBC before storage.
 *
 * Features:
 * - Multi-store support per company
 * - Encrypted consumer key and secret
 * - Sync configuration and status tracking
 * - Webhook secret for signature verification
 */

export interface IWooCommerceStore extends Document {
  companyId: Schema.Types.ObjectId;
  createdBy: Schema.Types.ObjectId;

  // Store details
  storeUrl: string; // e.g., https://example.com
  storeName: string;
  storeEmail?: string;
  apiVersion?: string;
  wpVersion?: string;
  wcVersion?: string;
  currency?: string;
  timezone?: string;

  // Authentication (encrypted)
  consumerKey: string; // REST API key (encrypted)
  consumerSecret: string; // REST API secret (encrypted)
  webhookSecret?: string; // For webhook signature verification

  // Status
  isActive: boolean;
  isPaused: boolean;
  connectedAt?: Date;
  lastSyncAt?: Date;
  syncStatus: 'active' | 'paused' | 'error';
  lastError?: string;
  errorCount: number;
  installedAt?: Date;
  uninstalledAt?: Date;

  // Webhooks
  webhooks: Array<{
    topic: string;
    woocommerceWebhookId?: string;
    address: string;
    secret: string;
    isActive: boolean;
    createdAt: Date;
    lastDeliveryAt?: Date;
  }>;

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
      syncDirection: 'ONE_WAY' | 'TWO_WAY';
      lastSyncAt?: Date;
      errorCount: number;
      lastError?: string;
    };
    webhooksEnabled: boolean;
  };

  // User-facing settings
  settings?: {
    syncFrequency?: string;
    autoFulfill?: boolean;
    autoTrackingUpdate?: boolean;
    syncHistoricalOrders?: boolean;
    historicalOrderDays?: number;
    orderFilters?: {
      minOrderValue?: number;
      maxOrderValue?: number;
      statusFilters?: string[];
      excludeStatuses?: string[];
    };
    notifications?: {
      syncErrors?: boolean;
      connectionIssues?: boolean;
      lowInventory?: boolean;
    };
  };

  // Statistics
  stats: {
    totalOrdersSynced: number;
    totalProductsMapped: number;
    totalInventorySyncs: number;
    lastOrderSyncAt?: Date;
    lastInventorySyncAt?: Date;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Methods
  decryptConsumerKey(): string;
  decryptConsumerSecret(): string;
  updateSyncStatus(type: 'order' | 'inventory', status: string, data?: any): Promise<void>;
  incrementSyncStats(type: 'order' | 'inventory', count: number): Promise<void>;
}


const WooCommerceStoreSchema = new Schema<IWooCommerceStore>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Store details
    storeUrl: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    storeName: {
      type: String,
      required: true,
      trim: true,
    },
    storeEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    apiVersion: {
      type: String,
    },
    wpVersion: {
      type: String,
    },
    wcVersion: {
      type: String,
    },
    currency: {
      type: String,
    },
    timezone: {
      type: String,
    },

    // Authentication
    consumerKey: {
      type: String,
      required: true,
      select: false, // Never select by default for security
    },
    consumerSecret: {
      type: String,
      required: true,
      select: false, // Never select by default for security
    },
    webhookSecret: {
      type: String,
      select: false,
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  isPaused: {
    type: Boolean,
    default: false,
  },
  connectedAt: {
    type: Date,
    default: Date.now,
  },
    lastSyncAt: {
      type: Date,
    },
    syncStatus: {
      type: String,
      enum: ['active', 'paused', 'error'],
      default: 'active',
    },
    lastError: {
      type: String,
    },
    errorCount: {
      type: Number,
      default: 0,
    },
    installedAt: {
      type: Date,
    },
    uninstalledAt: {
      type: Date,
    },

    // Webhooks
    webhooks: [{
      topic: { type: String, required: true },
      woocommerceWebhookId: { type: String },
      address: { type: String, required: true },
      secret: { type: String, required: true },
      isActive: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now },
      lastDeliveryAt: { type: Date },
    }],

    // Sync configuration
    syncConfig: {
      orderSync: {
        enabled: { type: Boolean, default: DEFAULT_SYNC_CONFIG.orderSync.enabled },
        autoSync: { type: Boolean, default: DEFAULT_SYNC_CONFIG.orderSync.autoSync },
        syncInterval: { type: Number, default: DEFAULT_SYNC_CONFIG.orderSync.syncInterval },
        lastSyncAt: { type: Date },
        syncStatus: {
          type: String,
          enum: ['IDLE', 'SYNCING', 'ERROR'],
          default: DEFAULT_SYNC_CONFIG.orderSync.syncStatus,
        },
        errorCount: { type: Number, default: DEFAULT_SYNC_CONFIG.orderSync.errorCount },
        lastError: { type: String },
      },
      inventorySync: {
        enabled: { type: Boolean, default: DEFAULT_SYNC_CONFIG.inventorySync.enabled },
        autoSync: { type: Boolean, default: DEFAULT_SYNC_CONFIG.inventorySync.autoSync },
        syncDirection: {
          type: String,
          enum: ['ONE_WAY', 'TWO_WAY'],
          default: DEFAULT_SYNC_CONFIG.inventorySync.syncDirection,
        },
        lastSyncAt: { type: Date },
        errorCount: { type: Number, default: DEFAULT_SYNC_CONFIG.inventorySync.errorCount },
        lastError: { type: String },
      },
      webhooksEnabled: { type: Boolean, default: DEFAULT_SYNC_CONFIG.webhooksEnabled },
    },

    settings: {
      type: Schema.Types.Mixed,
      default: () => ({
        ...DEFAULT_STORE_SETTINGS,
        orderFilters: { ...DEFAULT_STORE_SETTINGS.orderFilters },
        notifications: { ...DEFAULT_STORE_SETTINGS.notifications },
      }),
    },

    // Statistics
    stats: {
      totalOrdersSynced: { type: Number, default: 0 },
      totalProductsMapped: { type: Number, default: 0 },
      totalInventorySyncs: { type: Number, default: 0 },
      lastOrderSyncAt: { type: Date },
      lastInventorySyncAt: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
WooCommerceStoreSchema.index({ companyId: 1, storeUrl: 1 }, { unique: true });
WooCommerceStoreSchema.index({ companyId: 1, isActive: 1 });
WooCommerceStoreSchema.index({ 'syncConfig.orderSync.syncStatus': 1 });

// Pre-save hook: Encrypt credentials before saving
WooCommerceStoreSchema.pre('save', function (next) {
  if (this.isModified('consumerKey')) {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || '00000000000000000000000000000000', 'hex');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(this.consumerKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    this.consumerKey = iv.toString('hex') + ':' + encrypted;
  }

  if (this.isModified('consumerSecret')) {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || '00000000000000000000000000000000', 'hex');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(this.consumerSecret, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    this.consumerSecret = iv.toString('hex') + ':' + encrypted;
  }

  next();
});

// Method: Decrypt consumer key
WooCommerceStoreSchema.methods.decryptConsumerKey = function (): string {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || '00000000000000000000000000000000', 'hex');

  const parts = this.consumerKey.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

// Method: Decrypt consumer secret
WooCommerceStoreSchema.methods.decryptConsumerSecret = function (): string {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || '00000000000000000000000000000000', 'hex');

  const parts = this.consumerSecret.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

// Method: Update sync status
WooCommerceStoreSchema.methods.updateSyncStatus = async function (
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
WooCommerceStoreSchema.methods.incrementSyncStats = async function (
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

export default mongoose.model<IWooCommerceStore>('WooCommerceStore', WooCommerceStoreSchema);
