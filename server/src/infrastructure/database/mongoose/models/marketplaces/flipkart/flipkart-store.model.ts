import crypto from 'crypto';
import mongoose, { Document, Schema } from 'mongoose';
import { DEFAULT_STORE_SETTINGS, DEFAULT_SYNC_CONFIG } from '../../../../../../config/integration.defaults';

/**
 * FlipkartStore Model
 *
 * Stores Flipkart Seller Hub credentials and sync configuration.
 * Credentials are encrypted using AES-256-CBC before storage.
 *
 * Features:
 * - Multi-store support per company
 * - Encrypted API credentials
 * - Sync configuration and status tracking
 * - Webhook management
 */

export interface IFlipkartStore extends Document {
  companyId: Schema.Types.ObjectId;
  createdBy: Schema.Types.ObjectId;

  // Store details
  sellerId: string; // Flipkart Seller ID
  sellerName: string;
  sellerEmail?: string;
  storeUrl?: string;
  apiVersion?: string;

  // Authentication (encrypted)
  apiKey: string; // OAuth API key (encrypted)
  apiSecret: string; // OAuth API secret (encrypted)
  accessToken?: string; // OAuth access token (encrypted)
  tokenExpiresAt?: Date;

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
    flipkartWebhookId?: string;
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
    webhooksReceived: number;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Methods
  decryptApiKey(): string;
  decryptApiSecret(): string;
  decryptAccessToken(): string;
  updateSyncStatus(type: 'order' | 'inventory', status: string, data?: any): Promise<void>;
  incrementSyncStats(type: 'order' | 'inventory', count: number): Promise<void>;
  recordWebhookReceived(): Promise<void>;
}

const FlipkartStoreSchema = new Schema<IFlipkartStore>(
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
    sellerId: {
      type: String,
      required: true,
      trim: true,
    },
    sellerName: {
      type: String,
      required: true,
      trim: true,
    },
    sellerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    storeUrl: {
      type: String,
      trim: true,
    },
    apiVersion: {
      type: String,
    },

    // Authentication
    apiKey: {
      type: String,
      required: true,
      select: false,
    },
    apiSecret: {
      type: String,
      required: true,
      select: false,
    },
    accessToken: {
      type: String,
      select: false,
    },
    tokenExpiresAt: {
      type: Date,
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
    webhooks: [
      {
        topic: { type: String, required: true },
        flipkartWebhookId: { type: String },
        address: { type: String, required: true },
        secret: { type: String, required: true },
        isActive: { type: Boolean, default: true },
        createdAt: { type: Date, default: Date.now },
        lastDeliveryAt: { type: Date },
      },
    ],

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

    // Statistics
    stats: {
      totalOrdersSynced: { type: Number, default: 0 },
      totalProductsMapped: { type: Number, default: 0 },
      totalInventorySyncs: { type: Number, default: 0 },
      lastOrderSyncAt: { type: Date },
      lastInventorySyncAt: { type: Date },
      webhooksReceived: { type: Number, default: 0 },
    },

    settings: {
      type: Schema.Types.Mixed,
      default: () => ({
        ...DEFAULT_STORE_SETTINGS,
        orderFilters: { ...DEFAULT_STORE_SETTINGS.orderFilters },
        notifications: { ...DEFAULT_STORE_SETTINGS.notifications },
      }),
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
FlipkartStoreSchema.index({ companyId: 1, sellerId: 1 }, { unique: true });
FlipkartStoreSchema.index({ companyId: 1, isActive: 1 });
FlipkartStoreSchema.index({ 'syncConfig.orderSync.syncStatus': 1 });

// Pre-save hook: Encrypt credentials
FlipkartStoreSchema.pre('save', function (next) {
  const encryptField = (field: string): string => {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || '00000000000000000000000000000000', 'hex');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(field, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  };

  if (this.isModified('apiKey')) {
    this.apiKey = encryptField(this.apiKey);
  }

  if (this.isModified('apiSecret')) {
    this.apiSecret = encryptField(this.apiSecret);
  }

  if (this.isModified('accessToken') && this.accessToken) {
    this.accessToken = encryptField(this.accessToken);
  }

  next();
});

// Method: Decrypt API key
FlipkartStoreSchema.methods.decryptApiKey = function (): string {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || '00000000000000000000000000000000', 'hex');

  const parts = this.apiKey.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

// Method: Decrypt API secret
FlipkartStoreSchema.methods.decryptApiSecret = function (): string {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || '00000000000000000000000000000000', 'hex');

  const parts = this.apiSecret.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

// Method: Decrypt access token
FlipkartStoreSchema.methods.decryptAccessToken = function (): string {
  if (!this.accessToken) {
    return '';
  }

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
FlipkartStoreSchema.methods.updateSyncStatus = async function (
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
FlipkartStoreSchema.methods.incrementSyncStats = async function (
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
FlipkartStoreSchema.methods.recordWebhookReceived = async function (): Promise<void> {
  this.stats.webhooksReceived += 1;
  await this.save();
};

export default mongoose.model<IFlipkartStore>('FlipkartStore', FlipkartStoreSchema);
