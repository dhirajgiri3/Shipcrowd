import mongoose, { Document, Schema } from 'mongoose';
import { fieldEncryption } from 'mongoose-field-encryption';
import * as crypto from 'crypto';

// Define the interface for Company document
export interface ICompany extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  owner?: mongoose.Types.ObjectId;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  billingInfo: {
    gstin?: string;
    pan?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    upiId?: string;
  };
  branding: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    emailTemplate?: string;
  };
  integrations: {
    shopify?: {
      shopDomain?: string;
      accessToken?: string;
      scope?: string;
      lastSyncAt?: Date;
    };
    woocommerce?: {
      siteUrl?: string;
      consumerKey?: string;
      consumerSecret?: string;
      lastSyncAt?: Date;
    };
  };
  settings: {
    defaultWarehouseId?: mongoose.Types.ObjectId;
    defaultRateCardId?: mongoose.Types.ObjectId;
    notificationEmail?: string;
    notificationPhone?: string;
    autoGenerateInvoice?: boolean;
    currency?: string;
    timezone?: string;
  };
  wallet: {
    balance: number;
    currency: string;
    lastUpdated?: Date;
    lowBalanceThreshold: number;
  };

  status: 'profile_complete' | 'kyc_submitted' | 'approved' | 'suspended' | 'rejected';
  verificationLevel: 1 | 2 | 3;
  limits: {
    canCreateShipments: boolean;
    requiresKYC: boolean;
  };
  isActive: boolean;
  isDeleted: boolean;
  // ✅ FEATURE 27: Company Suspension Fields
  isSuspended?: boolean;
  suspendedAt?: Date;
  suspensionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Create the Company schema
const CompanySchema = new Schema<ICompany>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true, // This creates an index automatically
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    address: {
      line1: {
        type: String,
        required: false, // Made optional - collected during KYC
      },
      line2: String,
      city: {
        type: String,
        required: false, // Made optional - collected during KYC
      },
      state: {
        type: String,
        required: false, // Made optional - collected during KYC
      },
      country: {
        type: String,
        required: false, // Made optional - collected during KYC
        default: 'India',
      },
      postalCode: {
        type: String,
        required: false, // Made optional - collected during KYC
      },
    },
    billingInfo: {
      gstin: String,
      pan: String,
      bankName: String,
      accountNumber: String,
      ifscCode: String,
      upiId: String,
    },
    branding: {
      logo: String,
      primaryColor: String,
      secondaryColor: String,
      emailTemplate: String,
    },
    integrations: {
      shopify: {
        shopDomain: String,
        accessToken: String,
        scope: String,
        lastSyncAt: Date,
      },
      woocommerce: {
        siteUrl: String,
        consumerKey: String,
        consumerSecret: String,
        lastSyncAt: Date,
      },
    },
    settings: {
      defaultWarehouseId: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse',
      },
      defaultRateCardId: {
        type: Schema.Types.ObjectId,
        ref: 'RateCard',
      },
      notificationEmail: String,
      notificationPhone: String,
      autoGenerateInvoice: {
        type: Boolean,
        default: true,
      },
      currency: {
        type: String,
        default: 'INR',
      },
      timezone: {
        type: String,
        default: 'Asia/Kolkata',
      },
    },
    wallet: {
      balance: {
        type: Number,
        default: 0,
        min: [0, 'Wallet balance cannot be negative'],
      },
      currency: {
        type: String,
        default: 'INR',
      },
      lastUpdated: Date,
      lowBalanceThreshold: {
        type: Number,
        default: 500,
      },
    },

    status: {
      type: String,
      enum: ['profile_complete', 'kyc_submitted', 'approved', 'suspended', 'rejected'],
      default: 'profile_complete',
    },
    verificationLevel: {
      type: Number,
      enum: [1, 2, 3],
      default: 1,
      index: true,
    },
    limits: {
      canCreateShipments: {
        type: Boolean,
        default: false,
      },
      requiresKYC: {
        type: Boolean,
        default: true,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    // ✅ FEATURE 27: Company Suspension Fields
    isSuspended: {
      type: Boolean,
      default: false,
    },
    suspendedAt: Date,
    suspensionReason: String,
  },
  {
    timestamps: true,
    // Using default versionKey for optimistic locking (Mongoose requires string or false, not true)
  }
);

// Create indexes
// Name index is already created by unique: true
CompanySchema.index({ isDeleted: 1 });
CompanySchema.index({ 'address.postalCode': 1 });
CompanySchema.index({ status: 1 }); // Missing index for admin queries filtering by company status

// ============================================================================
// FIELD ENCRYPTION CONFIGURATION
// ============================================================================
// Encrypts sensitive credentials and PII at rest
// Reference: docs/Backend-Fixes-Suggestions.md, Section 4 - Security
// ============================================================================

// Validate encryption key exists at startup
console.log('🔒 Company Model: Initializing Encryption. Key present:', !!process.env.ENCRYPTION_KEY);
if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 64) {
  console.warn(
    '⚠️ ENCRYPTION_KEY warning in Company model: key missing or too short. ' +
    'Ensure .env has 64+ hex chars.'
  );
}

// Add field-level encryption plugin
// @ts-ignore
CompanySchema.plugin(fieldEncryption, {
  fields: [
    'billingInfo', // Encrypt entire billingInfo object
    'integrations' // Encrypt entire integrations object
  ],
  secret: process.env.ENCRYPTION_KEY || '0000000000000000000000000000000000000000000000000000000000000000',
  saltGenerator: () => crypto.randomBytes(8).toString('hex'),
  encryptOnSave: true,
  decryptOnFind: true,
});

// Create and export the Company model
const Company = mongoose.model<ICompany>('Company', CompanySchema);
export default Company;
