import mongoose, { Document, Schema } from 'mongoose';

/**
 * FlipkartSyncLog Model
 *
 * Tracks all Flipkart synchronization operations for monitoring and debugging.
 *
 * Features:
 * - Track order sync, inventory sync, and webhook processing
 * - Record success/failure with detailed error messages
 * - Calculate sync duration and success rate
 * - Support for pagination and filtering
 * - Automatic cleanup of old logs (90 days retention)
 */

export interface IFlipkartSyncLog extends Document {
  storeId: Schema.Types.ObjectId;
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

const FlipkartSyncLogSchema = new Schema<IFlipkartSyncLog>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'FlipkartStore',
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
      type: Number,
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
    collection: 'flipkart_sync_logs',
  }
);

// Indexes
FlipkartSyncLogSchema.index({ storeId: 1, syncType: 1, createdAt: -1 });
FlipkartSyncLogSchema.index({ createdAt: -1 });
FlipkartSyncLogSchema.index({ status: 1, syncType: 1 });

// Instance Methods

FlipkartSyncLogSchema.methods.completeSync = async function (
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

FlipkartSyncLogSchema.methods.completeSyncWithErrors = async function (
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
  this.syncErrors = syncErrors.slice(0, 100);
  this.status = failed === 0 ? 'COMPLETED' : 'PARTIAL';
  await this.save();
};

FlipkartSyncLogSchema.methods.failSync = async function (error: string): Promise<void> {
  this.status = 'FAILED';
  this.endTime = new Date();
  this.duration = this.endTime.getTime() - this.startTime.getTime();
  this.syncErrors = [error];
  await this.save();
};

// Static Methods

FlipkartSyncLogSchema.statics.getRecentLogs = function (
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

FlipkartSyncLogSchema.statics.getSyncStats = async function (storeId: string, syncType?: string) {
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

FlipkartSyncLogSchema.statics.cleanupOldLogs = async function (retentionDays: number = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await this.deleteMany({
    createdAt: { $lt: cutoffDate },
  });

  return result.deletedCount;
};

const FlipkartSyncLog = mongoose.model<IFlipkartSyncLog>('FlipkartSyncLog', FlipkartSyncLogSchema);

export default FlipkartSyncLog;
