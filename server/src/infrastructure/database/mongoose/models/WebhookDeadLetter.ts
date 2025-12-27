/**
 * Webhook Dead Letter Queue Model
 *
 * Stores failed webhook processing attempts for manual review and retry
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IWebhookDeadLetter extends Document {
  provider: string;                       // 'velocity-shipfast', 'bluedart', etc.
  eventType: string;                      // 'SHIPMENT_STATUS_UPDATE', etc.
  payload: Record<string, any>;           // Original webhook payload
  headers: Record<string, string>;        // Request headers
  receivedAt: Date;                       // When webhook was first received
  processingAttempts: number;             // Number of processing attempts
  lastAttemptAt: Date;                    // Last processing attempt timestamp
  lastError: string;                      // Last error message
  errorStack?: string;                    // Last error stack trace
  status: 'pending' | 'retrying' | 'failed' | 'resolved';
  resolvedAt?: Date;                      // When successfully processed
  resolvedBy?: mongoose.Types.ObjectId;   // User who manually resolved
  notes?: string;                         // Admin notes
  createdAt: Date;
  updatedAt: Date;
}

const WebhookDeadLetterSchema = new Schema<IWebhookDeadLetter>(
  {
    provider: {
      type: String,
      required: true,
      index: true
    },
    eventType: {
      type: String,
      required: true,
      index: true
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true
    },
    headers: {
      type: Map,
      of: String,
      required: true
    },
    receivedAt: {
      type: Date,
      required: true,
      index: true
    },
    processingAttempts: {
      type: Number,
      required: true,
      default: 0
    },
    lastAttemptAt: {
      type: Date,
      required: true
    },
    lastError: {
      type: String,
      required: true
    },
    errorStack: {
      type: String
    },
    status: {
      type: String,
      enum: ['pending', 'retrying', 'failed', 'resolved'],
      default: 'pending',
      index: true
    },
    resolvedAt: {
      type: Date
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Compound index for querying pending/failed webhooks
WebhookDeadLetterSchema.index({ provider: 1, status: 1, receivedAt: -1 });

// Index for cleanup queries
WebhookDeadLetterSchema.index({ status: 1, resolvedAt: 1 });

export default mongoose.model<IWebhookDeadLetter>('WebhookDeadLetter', WebhookDeadLetterSchema);
