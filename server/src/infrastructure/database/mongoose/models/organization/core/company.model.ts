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
    notificationEmail?: string;
    notificationPhone?: string;
    notificationPreferences?: {
      channels?: {
        email?: boolean;
        sms?: boolean;
        whatsapp?: boolean;
      };
      quietHours?: {
        enabled?: boolean;
        start?: string; // HH:mm
        end?: string;   // HH:mm
        timezone?: string;
      };
    };
    autoGenerateInvoice?: boolean;
    currency?: string;
    timezone?: string;
    risk?: {
      maxCodAmount?: number;
      blockBlacklisted?: boolean;
    };
    webhook?: {
      url?: string;
      secret?: string;
      enabled?: boolean;
      events?: string[];
    };
  };
  wallet: {
    balance: number;
    currency: string;
    lastUpdated?: Date;
    lowBalanceThreshold: number;
    autoRecharge?: {
      enabled: boolean;
      threshold: number;
      amount: number;
      paymentMethodId?: string;
      lastAttempt?: Date;
      lastSuccess?: Date;
      lastFailure?: {
        timestamp: Date;
        reason: string;
        retryCount: number;
        nextRetryAt: Date;
      };
      dailyLimit?: number;
      monthlyLimit?: number;
    };
  };

  // ✅ P0 FIX: Razorpay Fund Account Integration
  financial?: {
    razorpayContactId?: string;
    razorpayFundAccountId?: string;
    lastPayoutAt?: Date;
    totalPayoutsReceived?: number;
  };

  profileStatus: 'incomplete' | 'complete';
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

  // ✅ PHASE 1.4: Active Days (Streak) Tracking
  streakHistory?: {
    current: number;
    longest: number;
    longestAchievedAt?: Date;
    milestones?: Array<{
      days: number;
      achievedAt: Date;
      badge: string;
    }>;
  };

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
      notificationEmail: String,
      notificationPhone: String,
      notificationPreferences: {
        channels: {
          email: { type: Boolean, default: true },
          sms: { type: Boolean, default: true },
          whatsapp: { type: Boolean, default: true }
        },
        quietHours: {
          enabled: { type: Boolean, default: false },
          start: { type: String, default: '22:00' },
          end: { type: String, default: '08:00' },
          timezone: { type: String, default: 'Asia/Kolkata' }
        }
      },
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
      risk: {
        maxCodAmount: { type: Number, default: 5000 },
        blockBlacklisted: { type: Boolean, default: true }
      },
      // ✅ PHASE 3: Outbound Webhooks
      webhook: {
        url: String, // Endpoint to send POST requests
        secret: String, // HMAC secret for signature verification
        enabled: { type: Boolean, default: false },
        events: [{ type: String }] // List of subscribed events (e.g., 'shipment.status_update')
      }
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
      autoRecharge: {
        enabled: {
          type: Boolean,
          default: false,
        },
        threshold: {
          type: Number,
          default: 1000,
        },
        amount: {
          type: Number,
          default: 5000,
        },
        paymentMethodId: String, // Saved card/UPI mandate
        lastAttempt: Date,
        lastSuccess: Date,
        lastFailure: {
          timestamp: Date,
          reason: String,
          retryCount: { type: Number, default: 0 },
          nextRetryAt: Date,
        },
        dailyLimit: { type: Number, default: 100000 }, // ₹1 lakh default
        monthlyLimit: { type: Number, default: 500000 }, // ₹5 lakh default
      },
    },

    // ✅ P0 FIX: Razorpay Fund Account Integration for COD Settlements
    financial: {
      razorpayContactId: String,
      razorpayFundAccountId: String,
      lastPayoutAt: Date,
      totalPayoutsReceived: {
        type: Number,
        default: 0,
      },
    },

    // SECURITY: Track onboarding completion state
    profileStatus: {
      type: String,
      enum: ['incomplete', 'complete'],
      default: 'incomplete',
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

    // ✅ PHASE 1.4: Active Days (Streak) Tracking
    streakHistory: {
      current: {
        type: Number,
        default: 0,
      },
      longest: {
        type: Number,
        default: 0,
      },
      longestAchievedAt: Date,
      milestones: [{
        days: Number,
        achievedAt: Date,
        badge: String,
      }],
    },
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
