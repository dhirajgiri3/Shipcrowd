/**
 * WooCommerceSyncLog Model
 *
 * Tracks all WooCommerce sync operations for monitoring and debugging.
 * Similar to ShopifySyncLog but for WooCommerce stores.
 *
 * Features:
 * - Track order sync, inventory sync, and webhook processing
 * - Record success/failure with detailed error messages
 * - Calculate sync duration and success rate
 * - Support for pagination and filtering
 * - Automatic cleanup of old logs (90 days retention)
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IWooCommerceSyncLog extends Document {
  storeId: mongoose.Types.ObjectId;
  syncType: 'order' | 'inventory' | 'webhook' | 'product';
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
  startTime: Date;
  endTime?: Date;
  duration?: number; // in milliseconds
  itemsProcessed: number;
  itemsSynced: number;
  itemsSkipped: number;
  itemsFailed: number;
  syncErrors: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  completeSync(synced: number, skipped: number): Promise<void>;
  completeSyncWithErrors(
    synced: number,
    skipped: number,
    failed: number,
    syncErrors: string[]
  ): Promise<void>;
  failSync(error: string): Promise<void>;
}

const WooCommerceSyncLogSchema = new Schema<IWooCommerceSyncLog>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'WooCommerceStore',
      required: true,
      index: true,
    },
    syncType: {
      type: String,
      enum: ['order', 'inventory', 'webhook', 'product'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'COMPLETED', 'FAILED', 'PARTIAL'],
      required: true,
      default: 'IN_PROGRESS',
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    duration: {
      type: Number, // milliseconds
    },
    itemsProcessed: {
      type: Number,
      default: 0,
    },
    itemsSynced: {
      type: Number,
      default: 0,
    },
    itemsSkipped: {
      type: Number,
      default: 0,
    },
    itemsFailed: {
      type: Number,
      default: 0,
    },
    syncErrors: {
      type: [String],
      default: [],
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    collection: 'woocommerce_sync_logs',
  }
);

/**
 * Indexes
 */
WooCommerceSyncLogSchema.index({ storeId: 1, syncType: 1, createdAt: -1 });
WooCommerceSyncLogSchema.index({ createdAt: -1 }); // For cleanup job
WooCommerceSyncLogSchema.index({ status: 1, syncType: 1 }); // For querying active syncs

/**
 * Instance Methods
 */

/**
 * Complete sync successfully
 */
WooCommerceSyncLogSchema.methods.completeSync = async function (
  synced: number,
  skipped: number
): Promise<void> {
  this.status = 'COMPLETED';
  this.endTime = new Date();
  this.duration = this.endTime.getTime() - this.startTime.getTime();
  this.itemsSynced = synced;
  this.itemsSkipped = skipped;
  this.itemsProcessed = synced + skipped;
  await this.save();
};

/**
 * Complete sync with some errors (partial success)
 */
WooCommerceSyncLogSchema.methods.completeSyncWithErrors = async function (
  synced: number,
  skipped: number,
  failed: number,
  syncErrors: string[]
): Promise<void> {
  this.endTime = new Date();
  this.duration = this.endTime.getTime() - this.startTime.getTime();
  this.itemsSynced = synced;
  this.itemsSkipped = skipped;
  this.itemsFailed = failed;
  this.itemsProcessed = synced + skipped + failed;
  this.syncErrors = syncErrors.slice(0, 100); // Limit to 100 errors
  this.status = failed === 0 ? 'COMPLETED' : 'PARTIAL';
  await this.save();
};

/**
 * Mark sync as failed
 */
WooCommerceSyncLogSchema.methods.failSync = async function (error: string): Promise<void> {
  this.status = 'FAILED';
  this.endTime = new Date();
  this.duration = this.endTime.getTime() - this.startTime.getTime();
  this.syncErrors = [error];
  await this.save();
};

/**
 * Static Methods
 */

/**
 * Get recent sync logs for a store
 */
WooCommerceSyncLogSchema.statics.getRecentLogs = function (
  storeId: string,
  syncType?: string,
  limit: number = 10
) {
  const query: any = { storeId };
  if (syncType) {
    query.syncType = syncType;
  }

  return this.find(query).sort({ createdAt: -1 }).limit(limit).lean();
};

/**
 * Get sync statistics for a store
 */
WooCommerceSyncLogSchema.statics.getSyncStats = async function (
  storeId: string,
  syncType?: string
) {
  const match: any = { storeId: new mongoose.Types.ObjectId(storeId) };
  if (syncType) {
    match.syncType = syncType;
  }

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$syncType',
        totalSyncs: { $sum: 1 },
        successfulSyncs: {
          $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] },
        },
        failedSyncs: {
          $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] },
        },
        partialSyncs: {
          $sum: { $cond: [{ $eq: ['$status', 'PARTIAL'] }, 1, 0] },
        },
        totalItemsSynced: { $sum: '$itemsSynced' },
        totalItemsFailed: { $sum: '$itemsFailed' },
        avgDuration: { $avg: '$duration' },
        lastSyncAt: { $max: '$startTime' },
      },
    },
  ]);

  return stats;
};

/**
 * Get success rate for a store
 */
WooCommerceSyncLogSchema.statics.getSuccessRate = async function (
  storeId: string,
  syncType?: string,
  days: number = 7
) {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);

  const match: any = {
    storeId: new mongoose.Types.ObjectId(storeId),
    createdAt: { $gte: sinceDate },
  };

  if (syncType) {
    match.syncType = syncType;
  }

  const result = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        successful: {
          $sum: {
            $cond: [
              { $in: ['$status', ['COMPLETED', 'PARTIAL']] },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  if (result.length === 0) {
    return { successRate: 0, total: 0, successful: 0, period: `${days} days` };
  }

  const successRate = (result[0].successful / result[0].total) * 100;

  return {
    successRate: Math.round(successRate * 100) / 100,
    total: result[0].total,
    successful: result[0].successful,
    period: `${days} days`,
  };
};

/**
 * Cleanup old logs (90 days retention)
 */
WooCommerceSyncLogSchema.statics.cleanupOldLogs = async function (
  retentionDays: number = 90
) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await this.deleteMany({
    createdAt: { $lt: cutoffDate },
  });

  return result.deletedCount;
};

/**
 * Get logs with pagination
 */
WooCommerceSyncLogSchema.statics.getPaginatedLogs = async function (
  filters: {
    storeId?: string;
    syncType?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  },
  page: number = 1,
  limit: number = 50
) {
  const query: any = {};

  if (filters.storeId) {
    query.storeId = filters.storeId;
  }

  if (filters.syncType) {
    query.syncType = filters.syncType;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) {
      query.createdAt.$gte = filters.startDate;
    }
    if (filters.endDate) {
      query.createdAt.$lte = filters.endDate;
    }
  }

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    this.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('storeId', 'storeUrl storeName')
      .lean(),
    this.countDocuments(query),
  ]);

  return {
    logs,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    },
  };
};

/**
 * Get active (in-progress) syncs
 */
WooCommerceSyncLogSchema.statics.getActiveSyncs = function (storeId?: string) {
  const query: any = { status: 'IN_PROGRESS' };
  if (storeId) {
    query.storeId = storeId;
  }

  return this.find(query).sort({ startTime: -1 }).lean();
};

/**
 * Get failed syncs that need attention
 */
WooCommerceSyncLogSchema.statics.getFailedSyncs = function (
  storeId?: string,
  hoursBack: number = 24
) {
  const sinceDate = new Date();
  sinceDate.setHours(sinceDate.getHours() - hoursBack);

  const query: any = {
    status: 'FAILED',
    createdAt: { $gte: sinceDate },
  };

  if (storeId) {
    query.storeId = storeId;
  }

  return this.find(query).sort({ createdAt: -1 }).lean();
};

const WooCommerceSyncLog = mongoose.model<IWooCommerceSyncLog>(
  'WooCommerceSyncLog',
  WooCommerceSyncLogSchema
);

export default WooCommerceSyncLog;
