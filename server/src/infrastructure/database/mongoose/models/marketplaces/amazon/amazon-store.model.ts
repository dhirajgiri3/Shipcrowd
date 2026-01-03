import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

/**
 * AmazonStore Model
 *
 * Stores Amazon SP-API credentials and sync configuration.
 * Credentials are encrypted using AES-256-CBC before storage.
 *
 * Features:
 * - Multi-store support per company
 * - Encrypted LWA (Login with Amazon) OAuth credentials
 * - Encrypted AWS credentials for API signing
 * - Sync configuration and status tracking
 * - SQS notification support
 * - Webhook management
 */

export interface IAmazonStore extends Document {
  companyId: Schema.Types.ObjectId;
  createdBy: Schema.Types.ObjectId;

  // Store details
  sellerId: string; // Amazon Seller ID
  marketplaceId: string; // e.g., ATVPDKIKX0DER for US
  sellerName: string;
  sellerEmail?: string;
  region: string; // AWS region, e.g., 'us-east-1'
  apiVersion?: string;

  // LWA OAuth Authentication (encrypted)
  lwaClientId: string; // Login with Amazon OAuth client ID (encrypted)
  lwaClientSecret: string; // Login with Amazon OAuth client secret (encrypted)
  lwaRefreshToken: string; // Login with Amazon refresh token (encrypted)
  lwaAccessToken?: string; // LWA access token (encrypted)
  tokenExpiresAt?: Date;

  // AWS Credentials for API signing (encrypted)
  awsAccessKeyId: string; // AWS access key ID (encrypted)
  awsSecretAccessKey: string; // AWS secret access key (encrypted)
  roleArn: string; // IAM role ARN for SP-API

  // SQS Configuration
  sqsQueueUrl?: string; // SQS queue URL for notifications

  // Status
  isActive: boolean;
  isPaused: boolean;
  lastSyncAt?: Date;
  syncStatus: 'active' | 'paused' | 'error';
  lastError?: string;
  errorCount: number;
  installedAt?: Date;
  uninstalledAt?: Date;

  // Webhooks
  webhooks: Array<{
    topic: string;
    amazonWebhookId?: string;
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
  decryptLwaCredentials(): { clientId: string; clientSecret: string; refreshToken: string };
  decryptAwsCredentials(): { accessKeyId: string; secretAccessKey: string };
  decryptLwaAccessToken(): string;
  refreshAccessToken(): Promise<void>;
  updateSyncStatus(type: 'order' | 'inventory', status: string, data?: any): Promise<void>;
  incrementSyncStats(type: 'order' | 'inventory', count: number): Promise<void>;
  recordWebhookReceived(): Promise<void>;
}

const AmazonStoreSchema = new Schema<IAmazonStore>(
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
    marketplaceId: {
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
    region: {
      type: String,
      required: true,
      trim: true,
      default: 'us-east-1',
    },
    apiVersion: {
      type: String,
    },

    // LWA OAuth Authentication
    lwaClientId: {
      type: String,
      required: true,
      select: false,
    },
    lwaClientSecret: {
      type: String,
      required: true,
      select: false,
    },
    lwaRefreshToken: {
      type: String,
      required: true,
      select: false,
    },
    lwaAccessToken: {
      type: String,
      select: false,
    },
    tokenExpiresAt: {
      type: Date,
    },

    // AWS Credentials
    awsAccessKeyId: {
      type: String,
      required: true,
      select: false,
    },
    awsSecretAccessKey: {
      type: String,
      required: true,
      select: false,
    },
    roleArn: {
      type: String,
      required: true,
    },

    // SQS Configuration
    sqsQueueUrl: {
      type: String,
      trim: true,
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
        amazonWebhookId: { type: String },
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
        enabled: { type: Boolean, default: true },
        autoSync: { type: Boolean, default: true },
        syncInterval: { type: Number, default: 15 },
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
        autoSync: { type: Boolean, default: false },
        syncDirection: {
          type: String,
          enum: ['ONE_WAY', 'TWO_WAY'],
          default: 'ONE_WAY',
        },
        lastSyncAt: { type: Date },
        errorCount: { type: Number, default: 0 },
        lastError: { type: String },
      },
      webhooksEnabled: { type: Boolean, default: true },
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
  },
  {
    timestamps: true,
  }
);

// Indexes
AmazonStoreSchema.index({ companyId: 1, sellerId: 1 }, { unique: true });
AmazonStoreSchema.index({ companyId: 1, marketplaceId: 1 });
AmazonStoreSchema.index({ companyId: 1, isActive: 1 });
AmazonStoreSchema.index({ 'syncConfig.orderSync.syncStatus': 1 });

// Pre-save hook: Encrypt credentials
AmazonStoreSchema.pre('save', function (next) {
  const encryptField = (field: string): string => {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || '00000000000000000000000000000000', 'hex');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(field, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  };

  if (this.isModified('lwaClientId')) {
    this.lwaClientId = encryptField(this.lwaClientId);
  }

  if (this.isModified('lwaClientSecret')) {
    this.lwaClientSecret = encryptField(this.lwaClientSecret);
  }

  if (this.isModified('lwaRefreshToken')) {
    this.lwaRefreshToken = encryptField(this.lwaRefreshToken);
  }

  if (this.isModified('lwaAccessToken') && this.lwaAccessToken) {
    this.lwaAccessToken = encryptField(this.lwaAccessToken);
  }

  if (this.isModified('awsAccessKeyId')) {
    this.awsAccessKeyId = encryptField(this.awsAccessKeyId);
  }

  if (this.isModified('awsSecretAccessKey')) {
    this.awsSecretAccessKey = encryptField(this.awsSecretAccessKey);
  }

  next();
});

// Method: Decrypt LWA credentials
AmazonStoreSchema.methods.decryptLwaCredentials = function (): {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
} {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || '00000000000000000000000000000000', 'hex');

  const decryptField = (encryptedField: string): string => {
    const parts = encryptedField.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  };

  return {
    clientId: decryptField(this.lwaClientId),
    clientSecret: decryptField(this.lwaClientSecret),
    refreshToken: decryptField(this.lwaRefreshToken),
  };
};

// Method: Decrypt AWS credentials
AmazonStoreSchema.methods.decryptAwsCredentials = function (): {
  accessKeyId: string;
  secretAccessKey: string;
} {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || '00000000000000000000000000000000', 'hex');

  const decryptField = (encryptedField: string): string => {
    const parts = encryptedField.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  };

  return {
    accessKeyId: decryptField(this.awsAccessKeyId),
    secretAccessKey: decryptField(this.awsSecretAccessKey),
  };
};

// Method: Decrypt LWA access token
AmazonStoreSchema.methods.decryptLwaAccessToken = function (): string {
  if (!this.lwaAccessToken) {
    return '';
  }

  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || '00000000000000000000000000000000', 'hex');

  const parts = this.lwaAccessToken.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

// Method: Refresh LWA access token
AmazonStoreSchema.methods.refreshAccessToken = async function (): Promise<void> {
  // This will be implemented in the AmazonAuthService
  // For now, this is a placeholder method
  // The actual implementation will make a request to LWA token endpoint
  // and update the lwaAccessToken and tokenExpiresAt fields
  throw new Error('refreshAccessToken must be implemented in AmazonAuthService');
};

// Method: Update sync status
AmazonStoreSchema.methods.updateSyncStatus = async function (
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
AmazonStoreSchema.methods.incrementSyncStats = async function (
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
AmazonStoreSchema.methods.recordWebhookReceived = async function (): Promise<void> {
  this.stats.webhooksReceived += 1;
  await this.save();
};

export default mongoose.model<IAmazonStore>('AmazonStore', AmazonStoreSchema);
