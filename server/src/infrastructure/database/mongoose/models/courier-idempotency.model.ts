/**
 * Courier Shipment Idempotency Model
 * 
 * Prevents duplicate shipment creation on retries by storing idempotency keys.
 * When a shipment creation request is retried with the same idempotency key,
 * we return the original response instead of creating a duplicate shipment.
 * 
 * TTL: 30 days (auto-delete old records to prevent database bloat)
 * 
 * @example
 * ```typescript
 * // Before creating shipment
 * const existing = await CourierIdempotency.findOne({
 *   idempotencyKey: data.idempotencyKey,
 *   provider: 'ekart',
 *   companyId: this.companyId
 * });
 * 
 * if (existing) {
 *   // Return cached response
 *   return {
 *     trackingNumber: existing.trackingNumber,
 *     labelUrl: existing.labelUrl,
 *     cost: existing.cost
 *   };
 * }
 * 
 * // After successful shipment creation
 * await CourierIdempotency.create({
 *   idempotencyKey: data.idempotencyKey,
 *   companyId: this.companyId,
 *   orderId: data.orderNumber,
 *   provider: 'ekart',
 *   trackingNumber: response.trackingId,
 *   labelUrl: response.labelUrl,
 *   cost: response.cost
 * });
 * ```
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface ICourierIdempotency extends Document {
    idempotencyKey: string;
    companyId: mongoose.Types.ObjectId;
    orderId: string;
    provider: string; // 'ekart', 'velocity', 'delhivery', etc.

    // Provider response (cached for idempotent retries)
    providerShipmentId?: string;
    trackingNumber: string;
    labelUrl?: string;
    cost?: number;

    // Full request/response for debugging and flexible idempotency
    requestPayload?: any;
    responseData?: any;

    // Metadata
    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date; // Auto-delete after 30 days
}

const CourierIdempotencySchema = new Schema<ICourierIdempotency>(
    {
        idempotencyKey: {
            type: String,
            required: true,
            index: true,
            trim: true,
        },
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },
        orderId: {
            type: String,
            required: true,
            index: true,
            trim: true,
        },
        provider: {
            type: String,
            required: true,
            enum: ['ekart', 'velocity', 'delhivery', 'bluedart', 'dtdc', 'xpressbees', 'india-post'],
            lowercase: true,
        },
        providerShipmentId: {
            type: String,
            trim: true,
        },
        trackingNumber: {
            type: String,
            required: true,
            trim: true,
        },
        labelUrl: {
            type: String,
            trim: true,
        },
        cost: {
            type: Number,
            min: 0,
        },
        requestPayload: {
            type: Schema.Types.Mixed,
            required: false,
        },
        responseData: {
            type: Schema.Types.Mixed,
            required: false,
        },
        expiresAt: {
            type: Date,
            required: true,
            default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        },
    },
    {
        timestamps: true,
        collection: 'courier_idempotency',
    }
);

// ==================== Indexes ====================

/**
 * Compound unique index
 * Prevents duplicate shipments for same idempotency key + provider + company
 * This is the CRITICAL constraint that prevents duplicates
 */
CourierIdempotencySchema.index(
    { idempotencyKey: 1, provider: 1, companyId: 1 },
    { unique: true, name: 'idx_idempotency_unique' }
);

/**
 * TTL index for auto-deletion
 * MongoDB will automatically delete documents after expiresAt date
 */
CourierIdempotencySchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, name: 'idx_idempotency_ttl' }
);

/**
 * Index for querying by tracking number
 * Useful for debugging and auditing
 */
CourierIdempotencySchema.index(
    { trackingNumber: 1 },
    { name: 'idx_tracking_number' }
);

// ==================== Model ====================

const CourierIdempotency = mongoose.model<ICourierIdempotency>(
    'CourierIdempotency',
    CourierIdempotencySchema
);

export default CourierIdempotency;
