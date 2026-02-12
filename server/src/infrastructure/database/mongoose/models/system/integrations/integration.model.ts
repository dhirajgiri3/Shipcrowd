import mongoose, { Document, Schema } from 'mongoose';
import { fieldEncryption } from 'mongoose-field-encryption';
import * as crypto from 'crypto';

// Define the interface for Integration document
export interface IIntegration extends Document {
  companyId: mongoose.Types.ObjectId;
  type: 'courier' | 'ecommerce' | 'payment' | 'other';
  provider: string;
  credentials: {
    apiKey?: string;
    apiSecret?: string;
    username?: string;
    password?: string;
    accessToken?: string;
    refreshToken?: string;
    accountId?: string;
    clientId?: string;
    clientSecret?: string;
    webhookSecret?: string;
    [key: string]: any;
  };
  settings: {
    isActive: boolean;
    isPrimary?: boolean;
    baseUrl?: string;
    webhookUrl?: string;
    callbackUrl?: string;
    timeoutMs?: number;
    rateLimitPerMinute?: number;
    [key: string]: any;
  };
  metadata: {
    displayName?: string;
    lastSyncAt?: Date;
    lastErrorAt?: Date;
    lastError?: string;
    tokenExpiresAt?: Date;
    lastTokenRefresh?: Date;
    [key: string]: any;
  };
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Create the Integration schema
const IntegrationSchema = new Schema<IIntegration>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    type: {
      type: String,
      enum: ['courier', 'ecommerce', 'payment', 'other'],
      required: true,
    },
    provider: {
      type: String,
      required: true,
    },
    credentials: {
      apiKey: String,
      apiSecret: String,
      username: String,
      password: String,
      accessToken: String,
      refreshToken: String,
      accountId: String,
      clientId: String,
      clientSecret: String,
      webhookSecret: String,
    },
    settings: {
      isActive: {
        type: Boolean,
        default: true,
      },
      isPrimary: Boolean,
      baseUrl: String,
      webhookUrl: String,
      callbackUrl: String,
      timeoutMs: Number,
      rateLimitPerMinute: Number,
    },
    metadata: {
      displayName: String,
      lastSyncAt: Date,
      lastErrorAt: Date,
      lastError: String,
      tokenExpiresAt: Date,
      lastTokenRefresh: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    strict: false, // Allow additional fields in credentials and settings
  }
);

// Create indexes
IntegrationSchema.index({ companyId: 1 });
IntegrationSchema.index({ type: 1 });
IntegrationSchema.index({ provider: 1 });
IntegrationSchema.index({ isDeleted: 1 });
IntegrationSchema.index({ 'settings.isActive': 1 });

// ============================================================================
// FIELD ENCRYPTION CONFIGURATION
// ============================================================================
// Encrypts sensitive credentials and PII at rest
// Reference: docs/Backend-Fixes-Suggestions.md, Section 4 - Security
// ============================================================================

// Validate encryption key exists at startup
if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 64) {
  // Warn but don't crash if checking via other model first
  console.warn(
    '⚠️ ENCRYPTION_KEY warning in Integration model: key missing or too short. ' +
    'Ensure .env has 64+ hex chars.'
  );
}

// Add field-level encryption plugin
// @ts-ignore
IntegrationSchema.plugin(fieldEncryption, {
  fields: [
    'credentials'
  ],
  secret: process.env.ENCRYPTION_KEY || '0000000000000000000000000000000000000000000000000000000000000000', // Sane default
  saltGenerator: () => crypto.randomBytes(8).toString('hex'),
  encryptOnSave: true,
  decryptOnFind: true,
});

// Create and export the Integration model
const Integration = mongoose.model<IIntegration>('Integration', IntegrationSchema);
export default Integration;
