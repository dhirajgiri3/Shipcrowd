import mongoose, { Document, Model, Schema } from 'mongoose';

/**
 * WebhookEvent Model
 *
 * Logs all incoming webhook events from all platforms (Shopify, WooCommerce, Flipkart)
 * for debugging, replay, and audit purposes.
 *
 * Features:
 * - Multi-platform support via platform field
 * - Duplicate prevention via platform-specific event ID
 * - Retry tracking with exponential backoff
 * - Processing status and error logging
 * - Automatic cleanup of old events (90 days)
 */

export interface IWebhookEvent extends Document {
  storeId: Schema.Types.ObjectId;
  companyId: Schema.Types.ObjectId;

  // Platform identification
  platform: 'shopify' | 'woocommerce' | 'flipkart';

  // Webhook identification
  topic: string;
  eventId: string; // Platform-specific webhook ID (unique per platform)
  platformDomain?: string; // X-Shopify-Shop-Domain, WooCommerce site URL, etc.

  // Legacy fields (for backward compatibility)
  shopifyId?: string; // @deprecated - use eventId
  shopifyDomain?: string; // @deprecated - use platformDomain

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
    platform: 'shopify' | 'woocommerce' | 'flipkart';
    topic: string;
    eventId: string; // Platform-specific event ID
    platformDomain?: string;
    payload: any;
    headers: Record<string, string>;
    verified: boolean;
    hmacValid: boolean;
    // Legacy support
    shopifyId?: string;
    shopifyDomain?: string;
  }): Promise<{ event: IWebhookEvent; isDuplicate: boolean }>;

  getUnprocessed(limit?: number, platform?: string): Promise<IWebhookEvent[]>;
  getFailedEvents(limit?: number, platform?: string): Promise<IWebhookEvent[]>;
  getByTopic(storeId: string, topic: string, limit?: number): Promise<IWebhookEvent[]>;
  getStats(storeId: string, days?: number): Promise<any>;
  cleanupOldEvents(retentionDays?: number): Promise<number>;
  retryEvent(eventId: string): Promise<IWebhookEvent>;
  getQueueSize(platform?: string): Promise<{ unprocessed: number; failed: number; total: number }>;
}

const WebhookEventSchema = new Schema<IWebhookEvent>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },

    // Platform identification
    platform: {
      type: String,
      required: true,
      enum: ['shopify', 'woocommerce', 'flipkart'],
      index: true,
    },

    // Webhook identification
    topic: {
      type: String,
      required: true,
      index: true,
      enum: [
        // Shopify topics
        'orders/create',
        'orders/updated',
        'orders/cancelled',
        'orders/fulfilled',
        'products/update',
        'inventory_levels/update',
        'app/uninstalled',
        'shop/update',
        // WooCommerce topics
        'order.created',
        'order.updated',
        'order.deleted',
        'product.created',
        'product.updated',
        'product.deleted',
        'customer.created',
        'customer.updated',
        // Flipkart topics
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
    eventId: {
      type: String,
      required: true,
      index: true,
    },
    platformDomain: {
      type: String,
    },

    // Legacy fields (backward compatibility)
    shopifyId: {
      type: String,
      sparse: true, // Allow null for non-Shopify webhooks
    },
    shopifyDomain: {
      type: String,
      sparse: true,
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
WebhookEventSchema.index({ platform: 1, eventId: 1 }, { unique: true }); // Prevent duplicates per platform
WebhookEventSchema.index({ platform: 1, processed: 1 }); // Platform-specific queries

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
  platform: 'shopify' | 'woocommerce' | 'flipkart';
  topic: string;
  eventId: string;
  platformDomain?: string;
  payload: any;
  headers: Record<string, string>;
  verified: boolean;
  hmacValid: boolean;
  shopifyId?: string;
  shopifyDomain?: string;
}) {
  // Check for duplicate using platform + eventId composite key
  const existing = await this.findOne({
    platform: data.platform,
    eventId: data.eventId,
  });

  if (existing) {
    return { event: existing, isDuplicate: true };
  }

  const event = await this.create({
    ...data,
    apiVersion: data.headers['x-shopify-api-version'] || data.headers['x-wc-webhook-id'],
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
WebhookEventSchema.statics.getUnprocessed = function (limit: number = 100, platform?: string) {
  const query: any = {
    processed: false,
    retryCount: { $lt: this.schema.path('maxRetries').options.default || 5 },
  };

  if (platform) {
    query.platform = platform;
  }

  return this.find(query)
    .sort({ receivedAt: 1 }) // Process oldest first
    .limit(limit);
};

// Static method: Get failed events (dead letter queue)
WebhookEventSchema.statics.getFailedEvents = function (limit: number = 50, platform?: string) {
  const query: any = {
    retryCount: { $gte: this.schema.path('maxRetries').options.default || 5 },
  };

  if (platform) {
    query.platform = platform;
  }

  return this.find(query)
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
WebhookEventSchema.statics.getQueueSize = async function (platform?: string) {
  const query: any = {};
  if (platform) {
    query.platform = platform;
  }

  const [unprocessed, failed] = await Promise.all([
    this.countDocuments({
      ...query,
      processed: false,
      retryCount: { $lt: this.schema.path('maxRetries').options.default || 5 },
    }),
    this.countDocuments({
      ...query,
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
