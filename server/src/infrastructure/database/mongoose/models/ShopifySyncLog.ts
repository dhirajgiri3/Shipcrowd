import mongoose, { Schema, Document } from 'mongoose';

/**
 * ShopifySyncLog Model
 *
 * Comprehensive logging for all Shopify synchronization operations.
 * Tracks orders, inventory, webhooks with detailed error reporting.
 */

export interface ISyncError {
  itemId: string; // Order ID, SKU, or Variant ID
  itemName?: string;
  error: string;
  errorCode?: string;
  timestamp: Date;
}

export interface IShopifySyncLog extends Document {
  storeId: Schema.Types.ObjectId;
  companyId: Schema.Types.ObjectId;

  // Sync details
  syncType: 'ORDER' | 'INVENTORY' | 'WEBHOOK' | 'PRODUCT' | 'FULFILLMENT';
  syncTrigger: 'MANUAL' | 'SCHEDULED' | 'WEBHOOK' | 'FULFILLMENT';
  status: 'IN_PROGRESS' | 'COMPLETED' | 'PARTIAL' | 'FAILED';

  // Timing
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds

  // Metrics
  itemsProcessed: number;
  itemsSynced: number;
  itemsFailed: number;
  itemsSkipped: number;

  // Results
  successRate: number; // percentage
  syncErrors: ISyncError[];

  // Metadata
  metadata: {
    triggeredBy?: Schema.Types.ObjectId; // User ID for manual syncs
    jobId?: string; // BullMQ job ID
    orderIdRange?: { start: string; end: string };
    skuList?: string[];
    webhookTopic?: string;
    apiVersion?: string;
    [key: string]: any;
  };

  // Performance
  apiCallsUsed: number;
  avgResponseTime?: number; // milliseconds
  rateLimitHit: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Methods
  completeSyncSuccess(data: { itemsSynced: number; itemsSkipped?: number; apiCallsUsed?: number }): Promise<void>;
  completeSyncWithErrors(data: { itemsSynced: number; itemsFailed: number; syncErrors: ISyncError[]; apiCallsUsed?: number }): Promise<void>;
  failSync(error: string): Promise<void>;
  addError(error: ISyncError): void;
}


const ShopifySyncLogSchema = new Schema<IShopifySyncLog>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'ShopifyStore',
      required: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },

    // Sync details
    syncType: {
      type: String,
      enum: ['ORDER', 'INVENTORY', 'WEBHOOK', 'PRODUCT', 'FULFILLMENT'],
      required: true,
      index: true,
    },
    syncTrigger: {
      type: String,
      enum: ['MANUAL', 'SCHEDULED', 'WEBHOOK', 'FULFILLMENT'],
      required: true,
    },
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'COMPLETED', 'PARTIAL', 'FAILED'],
      required: true,
      default: 'IN_PROGRESS',
      index: true,
    },

    // Timing
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    endTime: {
      type: Date,
    },
    duration: {
      type: Number, // milliseconds
    },

    // Metrics
    itemsProcessed: {
      type: Number,
      default: 0,
    },
    itemsSynced: {
      type: Number,
      default: 0,
    },
    itemsFailed: {
      type: Number,
      default: 0,
    },
    itemsSkipped: {
      type: Number,
      default: 0,
    },

    // Results
    successRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    syncErrors: [
      {
        itemId: { type: String, required: true },
        itemName: { type: String },
        error: { type: String, required: true },
        errorCode: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],

    // Metadata
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },

    // Performance
    apiCallsUsed: {
      type: Number,
      default: 0,
    },
    avgResponseTime: {
      type: Number, // milliseconds
    },
    rateLimitHit: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ShopifySyncLogSchema.index({ storeId: 1, syncType: 1, createdAt: -1 });
ShopifySyncLogSchema.index({ companyId: 1, status: 1, createdAt: -1 });
ShopifySyncLogSchema.index({ status: 1, endTime: 1 }); // For cleanup queries

// Pre-save: Calculate duration and success rate
ShopifySyncLogSchema.pre('save', function (next) {
  if (this.endTime && this.startTime) {
    this.duration = this.endTime.getTime() - this.startTime.getTime();
  }

  if (this.itemsProcessed > 0) {
    this.successRate = Math.round((this.itemsSynced / this.itemsProcessed) * 100);
  }

  next();
});

// Static method: Create new sync log
ShopifySyncLogSchema.statics.createSyncLog = function (data: {
  storeId: string;
  companyId: string;
  syncType: string;
  syncTrigger: string;
  metadata?: any;
}) {
  return this.create({
    storeId: data.storeId,
    companyId: data.companyId,
    syncType: data.syncType,
    syncTrigger: data.syncTrigger,
    metadata: data.metadata || {},
    startTime: new Date(),
  });
};

// Instance method: Complete sync (success)
ShopifySyncLogSchema.methods.completeSyncSuccess = async function (data: {
  itemsSynced: number;
  itemsSkipped?: number;
  apiCallsUsed?: number;
}) {
  this.status = 'COMPLETED';
  this.endTime = new Date();
  this.itemsProcessed = data.itemsSynced + (data.itemsSkipped || 0);
  this.itemsSynced = data.itemsSynced;
  this.itemsSkipped = data.itemsSkipped || 0;
  this.apiCallsUsed = data.apiCallsUsed || 0;
  await this.save();
};

// Instance method: Complete sync (with errors)
ShopifySyncLogSchema.methods.completeSyncWithErrors = async function (data: {
  itemsSynced: number;
  itemsFailed: number;
  syncErrors: ISyncError[];
  apiCallsUsed?: number;
}) {
  this.status = data.itemsFailed === 0 ? 'COMPLETED' : data.itemsSynced > 0 ? 'PARTIAL' : 'FAILED';
  this.endTime = new Date();
  this.itemsProcessed = data.itemsSynced + data.itemsFailed;
  this.itemsSynced = data.itemsSynced;
  this.itemsFailed = data.itemsFailed;
  this.syncErrors = data.syncErrors;
  this.apiCallsUsed = data.apiCallsUsed || 0;
  await this.save();
};

// Instance method: Fail sync
ShopifySyncLogSchema.methods.failSync = async function (error: string) {
  this.status = 'FAILED';
  this.endTime = new Date();
  this.syncErrors = [
    {
      itemId: 'SYNC_ERROR',
      error,
      timestamp: new Date(),
    },
  ];
  await this.save();
};

// Instance method: Add error
ShopifySyncLogSchema.methods.addError = function (error: ISyncError) {
  this.syncErrors.push(error);
  this.itemsFailed += 1;
};

// Static method: Get recent sync logs
ShopifySyncLogSchema.statics.getRecentLogs = function (
  storeId: string,
  syncType?: string,
  limit: number = 20
) {
  const filter: any = { storeId };
  if (syncType) filter.syncType = syncType;

  return this.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('-syncErrors'); // Exclude detailed errors for overview
};

// Static method: Get sync statistics
ShopifySyncLogSchema.statics.getSyncStats = async function (
  storeId: string,
  days: number = 7
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const logs = await this.find({
    storeId,
    createdAt: { $gte: startDate },
  });

  const stats = {
    totalSyncs: logs.length,
    successfulSyncs: logs.filter((l: any) => l.status === 'COMPLETED').length,
    failedSyncs: logs.filter((l: any) => l.status === 'FAILED').length,
    partialSyncs: logs.filter((l: any) => l.status === 'PARTIAL').length,
    totalItemsSynced: logs.reduce((sum: number, l: any) => sum + l.itemsSynced, 0),
    totalItemsFailed: logs.reduce((sum: number, l: any) => sum + l.itemsFailed, 0),
    avgDuration: 0,
    avgSuccessRate: 0,
    rateLimitHits: logs.filter((l: any) => l.rateLimitHit).length,
  };

  const completedLogs = logs.filter((l: any) => l.duration);
  if (completedLogs.length > 0) {
    stats.avgDuration = Math.round(
      completedLogs.reduce((sum: number, l: any) => sum + l.duration, 0) / completedLogs.length
    );
    stats.avgSuccessRate = Math.round(
      logs.reduce((sum: number, l: any) => sum + l.successRate, 0) / logs.length
    );
  }

  return stats;
};

// Static method: Cleanup old logs (retention: 90 days)
ShopifySyncLogSchema.statics.cleanupOldLogs = async function (retentionDays: number = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await this.deleteMany({
    createdAt: { $lt: cutoffDate },
  });

  return result.deletedCount;
};

export default mongoose.model<IShopifySyncLog>('ShopifySyncLog', ShopifySyncLogSchema);
