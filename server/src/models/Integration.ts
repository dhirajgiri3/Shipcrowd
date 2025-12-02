import mongoose, { Document, Schema } from 'mongoose';

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
    webhookUrl?: string;
    callbackUrl?: string;
    [key: string]: any;
  };
  metadata: {
    lastSyncAt?: Date;
    lastErrorAt?: Date;
    lastError?: string;
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
      webhookUrl: String,
      callbackUrl: String,
    },
    metadata: {
      lastSyncAt: Date,
      lastErrorAt: Date,
      lastError: String,
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

// Create and export the Integration model
const Integration = mongoose.model<IIntegration>('Integration', IntegrationSchema);
export default Integration;
