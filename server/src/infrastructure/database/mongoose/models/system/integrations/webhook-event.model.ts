import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * WebhookEvent Model
 *
 * Logs all incoming webhook events from Shopify for debugging,
 * replay, and audit purposes.
 *
 * Features:
 * - Duplicate prevention via shopifyId unique index
 * - Retry tracking with exponential backoff
 * - Processing status and error logging
 * - Automatic cleanup of old events (90 days)
 */

export interface IWebhookEvent extends Document {
  storeId: Schema.Types.ObjectId;
  companyId: Schema.Types.ObjectId;

  // Webhook identification
  topic: string;
  shopifyId: string; // X-Shopify-Webhook-Id header
  shopifyDomain: string; // X-Shopify-Shop-Domain header

  // Payload and headers
  payload: any;
  headers: Record<string, string>;

  // Verification
  verified: boolean;
  hmacValid: boolean;

  // Processing status
  processed: boolean;
  processedAt?: Date;
  processingError?: string;
  retryCount: number;
  maxRetries: number;

  // Metadata
  apiVersion?: string;
  receivedAt: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  markProcessed(): Promise<void>;
  markFailed(error: string): Promise<void>;
  incrementRetry(): Promise<void>;
}

// Static methods interface
export interface IWebhookEventModel extends Model<IWebhookEvent> {
  createEvent(data: {
    storeId: string;
    companyId: string;
    topic: string;
    shopifyId: string;
    shopifyDomain: string;
    payload: any;
    headers: Record<string, string>;
    verified: boolean;
    hmacValid: boolean;
  }): Promise<{ event: IWebhookEvent; isDuplicate: boolean }>;

  getUnprocessed(limit?: number): Promise<IWebhookEvent[]>;
  getFailedEvents(limit?: number): Promise<IWebhookEvent[]>;
  getByTopic(storeId: string, topic: string, limit?: number): Promise<IWebhookEvent[]>;
  getStats(storeId: string, days?: number): Promise<any>;
  cleanupOldEvents(retentionDays?: number): Promise<number>;
  retryEvent(eventId: string): Promise<IWebhookEvent>;
  getQueueSize(): Promise<{ unprocessed: number; failed: number; total: number }>;
}

const WebhookEventSchema = new Schema<IWebhookEvent>(
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

    // Webhook identification
    topic: {
      type: String,
      required: true,
      index: true,
      enum: [
        'orders/create',
        'orders/updated',
        'orders/cancelled',
        'orders/fulfilled',
        'products/update',
        'inventory_levels/update',
        'app/uninstalled',
        'shop/update',
        'order/create',
        'order/approve',
        'order/ready-to-dispatch',
        'order/dispatch',
        'order/deliver',
        'order/cancel',
        'order/return',
        'inventory/update',
      ],
    },
    shopifyId: {
      type: String,
      required: true,
      unique: true, // Prevent duplicate processing
      index: true,
    },
    shopifyDomain: {
      type: String,
      required: true,
    },

    // Payload and headers
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    headers: {
      type: Schema.Types.Mixed,
      default: {},
    },

    // Verification
    verified: {
      type: Boolean,
      default: false,
    },
    hmacValid: {
      type: Boolean,
      default: false,
    },

    // Processing status
    processed: {
      type: Boolean,
      default: false,
      index: true,
    },
    processedAt: {
      type: Date,
    },
    processingError: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 5,
    },

    // Metadata
    apiVersion: {
      type: String,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
WebhookEventSchema.index({ storeId: 1, topic: 1, createdAt: -1 });
WebhookEventSchema.index({ processed: 1, retryCount: 1 }); // For retry queries
WebhookEventSchema.index({ createdAt: 1 }); // For cleanup queries

// Virtual: Can retry?
WebhookEventSchema.virtual('canRetry').get(function () {
  return !this.processed && this.retryCount < this.maxRetries;
});

// Virtual: Is failed?
WebhookEventSchema.virtual('isFailed').get(function () {
  return !this.processed && this.retryCount >= this.maxRetries;
});

// Virtual: Processing duration
WebhookEventSchema.virtual('processingDuration').get(function () {
  if (!this.processedAt) return null;
  return this.processedAt.getTime() - this.receivedAt.getTime();
});

// Static method: Create webhook event
WebhookEventSchema.statics.createEvent = async function (data: {
  storeId: string;
  companyId: string;
  topic: string;
  shopifyId: string;
  shopifyDomain: string;
  payload: any;
  headers: Record<string, string>;
  verified: boolean;
  hmacValid: boolean;
}) {
  // Check for duplicate
  const existing = await this.findOne({ shopifyId: data.shopifyId });
  if (existing) {
    return { event: existing, isDuplicate: true };
  }

  const event = await this.create({
    ...data,
    apiVersion: data.headers['x-shopify-api-version'],
    receivedAt: new Date(),
  });

  return { event, isDuplicate: false };
};

// Instance method: Mark as processed
WebhookEventSchema.methods.markProcessed = async function () {
  this.processed = true;
  this.processedAt = new Date();
  this.processingError = undefined;
  await this.save();
};

// Instance method: Mark as failed
WebhookEventSchema.methods.markFailed = async function (error: string) {
  this.retryCount += 1;
  this.processingError = error;

  // If max retries reached, mark as permanently failed
  if (this.retryCount >= this.maxRetries) {
    this.processed = true; // Mark as processed to prevent further retries
  }

  await this.save();
};

// Instance method: Increment retry count
WebhookEventSchema.methods.incrementRetry = async function () {
  this.retryCount += 1;
  await this.save();
};

// Static method: Get unprocessed events
WebhookEventSchema.statics.getUnprocessed = function (limit: number = 100) {
  return this.find({
    processed: false,
    retryCount: { $lt: this.schema.path('maxRetries').options.default || 5 },
  })
    .sort({ receivedAt: 1 }) // Process oldest first
    .limit(limit);
};

// Static method: Get failed events (dead letter queue)
WebhookEventSchema.statics.getFailedEvents = function (limit: number = 50) {
  return this.find({
    retryCount: { $gte: this.schema.path('maxRetries').options.default || 5 },
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method: Get events by topic
WebhookEventSchema.statics.getByTopic = function (
  storeId: string,
  topic: string,
  limit: number = 50
) {
  return this.find({ storeId, topic })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method: Get webhook statistics
WebhookEventSchema.statics.getStats = async function (
  storeId: string,
  days: number = 7
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const events = await this.find({
    storeId,
    createdAt: { $gte: startDate },
  });

  const stats = {
    total: events.length,
    processed: events.filter((e: any) => e.processed).length,
    failed: events.filter((e: any) => e.retryCount >= e.maxRetries).length,
    pending: events.filter((e: any) => !e.processed && e.retryCount < e.maxRetries).length,
    avgProcessingTime: 0,
    byTopic: {} as Record<string, number>,
  };

  // Calculate average processing time
  const processedEvents = events.filter((e: any) => e.processedAt);
  if (processedEvents.length > 0) {
    const totalDuration = processedEvents.reduce((sum: number, e: any) => {
      return sum + (e.processedAt.getTime() - e.receivedAt.getTime());
    }, 0);
    stats.avgProcessingTime = Math.round(totalDuration / processedEvents.length);
  }

  // Count by topic
  events.forEach((e: any) => {
    stats.byTopic[e.topic] = (stats.byTopic[e.topic] || 0) + 1;
  });

  return stats;
};

// Static method: Cleanup old events (retention: 90 days)
WebhookEventSchema.statics.cleanupOldEvents = async function (retentionDays: number = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await this.deleteMany({
    createdAt: { $lt: cutoffDate },
    processed: true, // Only delete processed events
  });

  return result.deletedCount;
};

// Static method: Retry failed event
WebhookEventSchema.statics.retryEvent = async function (eventId: string) {
  const event = await this.findById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  if (event.processed) {
    throw new Error('Event already processed');
  }

  // Reset retry count to allow one more attempt
  event.retryCount = Math.max(0, event.retryCount - 1);
  event.processingError = undefined;
  await event.save();

  return event;
};

// Static method: Get processing queue size
WebhookEventSchema.statics.getQueueSize = async function () {
  const [unprocessed, failed] = await Promise.all([
    this.countDocuments({
      processed: false,
      retryCount: { $lt: this.schema.path('maxRetries').options.default || 5 },
    }),
    this.countDocuments({
      processed: false,
      retryCount: { $gte: this.schema.path('maxRetries').options.default || 5 },
    }),
  ]);

  return {
    unprocessed,
    failed,
    total: unprocessed + failed,
  };
};

export default mongoose.model<IWebhookEvent, IWebhookEventModel>('WebhookEvent', WebhookEventSchema);
