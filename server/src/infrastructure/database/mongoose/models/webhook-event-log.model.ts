/**
 * Webhook Event Log Model
 * 
 * Stores webhook events for deduplication and auditing.
 * Prevents replay attacks and duplicate event processing using event hash.
 * 
 * TTL: 90 days (compliance and debugging)
 * 
 * @example
 * ```typescript
 * // Calculate event hash
 * const eventHash = crypto
 *   .createHash('sha256')
 *   .update(JSON.stringify(payload))
 *   .digest('hex');
 * 
 * // Check for duplicate
 * const existing = await WebhookEventLog.findOne({
 *   eventHash,
 *   provider: 'ekart'
 * });
 * 
 * if (existing) {
 *   // Duplicate event, skip processing
 *   return { status: 'duplicate', message: 'Event already processed' };
 * }
 * 
 * // Store event
 * await WebhookEventLog.create({
 *   provider: 'ekart',
 *   eventType: 'track_updated',
 *   eventHash,
 *   payload,
 *   trackingNumber: payload.tracking_id,
 *   status: 'processed'
 * });
 * ```
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IWebhookEventLog extends Document {
    provider: string; // 'ekart', 'velocity', 'delhivery', etc.
    eventType: string; // 'track_updated', 'shipment_created', etc.
    eventHash: string; // SHA256 hash of payload for deduplication

    // Event data
    payload: any; // Raw webhook payload
    trackingNumber?: string;
    orderId?: string;

    // Processing status
    status: 'pending' | 'processed' | 'failed';
    processedAt?: Date;
    error?: string;

    // Metadata
    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date; // Auto-delete after 90 days
}

const WebhookEventLogSchema = new Schema<IWebhookEventLog>(
    {
        provider: {
            type: String,
            required: true,
            enum: ['ekart', 'velocity', 'delhivery', 'bluedart', 'dtdc', 'xpressbees', 'india-post'],
            lowercase: true,
            index: true,
        },
        eventType: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        eventHash: {
            type: String,
            required: true,
            length: 64, // SHA256 produces 64 hex characters
            index: true,
        },
        payload: {
            type: Schema.Types.Mixed,
            required: true,
        },
        trackingNumber: {
            type: String,
            trim: true,
            index: true,
        },
        orderId: {
            type: String,
            trim: true,
            index: true,
        },
        status: {
            type: String,
            required: true,
            enum: ['pending', 'processed', 'failed'],
            default: 'pending',
            index: true,
        },
        processedAt: {
            type: Date,
        },
        error: {
            type: String,
        },
        expiresAt: {
            type: Date,
            required: true,
            default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        },
    },
    {
        timestamps: true,
        collection: 'webhook_event_logs',
    }
);

// ==================== Indexes ====================

/**
 * Compound unique index for deduplication
 * Prevents processing the same event twice
 * CRITICAL: This is what prevents replay attacks
 */
WebhookEventLogSchema.index(
    { eventHash: 1, provider: 1 },
    { unique: true, name: 'idx_webhook_dedupe' }
);

/**
 * TTL index for auto-deletion
 * MongoDB will automatically delete documents after expiresAt date
 */
WebhookEventLogSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, name: 'idx_webhook_ttl' }
);

/**
 * Index for querying by tracking number and provider
 * Useful for debugging and auditing
 */
WebhookEventLogSchema.index(
    { trackingNumber: 1, provider: 1 },
    { name: 'idx_tracking_provider' }
);

/**
 * Index for querying failed events
 * Useful for monitoring and alerting
 */
WebhookEventLogSchema.index(
    { status: 1, createdAt: -1 },
    { name: 'idx_status_created' }
);

// ==================== Model ====================

const WebhookEventLog = mongoose.model<IWebhookEventLog>(
    'WebhookEventLog',
    WebhookEventLogSchema
);

export default WebhookEventLog;
