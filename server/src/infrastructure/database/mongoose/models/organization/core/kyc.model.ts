import mongoose, { Document, Schema } from 'mongoose';
import { arrayLimit } from '../../../../../../shared/utils/arrayValidators';
import { fieldEncryption } from 'mongoose-field-encryption';
import crypto from 'crypto';
import { KYCState } from '../../../../../../core/domain/types/kyc-state';
import { DocumentVerificationState } from '../../../../../../core/domain/types/document-verification-state';
import { KYC_VERIFICATION_HISTORY_LIMIT } from '../../../../../../shared/config/kyc.config';

// Define the interface for KYC document
export interface IKYCVerificationMeta {
  state: DocumentVerificationState;
  provider?: string;
  verifiedAt?: Date;
  expiresAt?: Date;
  attemptId?: string;
  inputHash?: string;
  lastCheckedAt?: Date;
  failureReason?: string;
  revokedAt?: Date;
}

export interface IKYCVerificationHistoryEntry {
  id: string;
  state: DocumentVerificationState;
  provider?: string;
  verifiedAt?: Date;
  expiresAt?: Date;
  attemptId?: string;
  inputHash?: string;
  createdAt: Date;
  reason?: string;
}

export interface IKYC extends Document {
  userId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;

  // ✅ FEATURE 10: KYC State Machine
  state: KYCState;

  /** @deprecated Use `state` instead */
  status: 'pending' | 'verified' | 'rejected';

  documents: {
    pan?: {
      number: string;
      image: string;
      verified: boolean;
      verifiedAt?: Date;
      verificationData?: any; // Store API response
      name?: string; // Name as per PAN
      verification?: IKYCVerificationMeta;
      verificationHistory?: IKYCVerificationHistoryEntry[];
    };
    aadhaar?: {
      number: string;
      frontImage: string;
      backImage: string;
      verified: boolean;
      verifiedAt?: Date;
      verificationData?: any; // Store API response
      verification?: IKYCVerificationMeta;
      verificationHistory?: IKYCVerificationHistoryEntry[];
    };
    gstin?: {
      number: string;
      verified: boolean;
      verifiedAt?: Date;
      verificationData?: any; // Store API response
      businessName?: string; // Business name as per GSTIN
      legalName?: string; // Legal name of the business
      status?: string; // Active, Inactive, etc.
      registrationType?: string; // Regular, Composition, etc.
      businessType?: string[]; // Array of business types
      addresses?: {
        type: string; // Principal, Additional, etc.
        address: string; // Formatted address
        businessNature?: string; // Nature of business at this address
      }[];
      registrationDate?: string; // Date of GST registration
      lastUpdated?: string; // Last updated date in GST records
      verification?: IKYCVerificationMeta;
      verificationHistory?: IKYCVerificationHistoryEntry[];
    };
    bankAccount?: {
      bankAccountId?: mongoose.Types.ObjectId;
      accountNumber: string;
      ifscCode: string;
      accountHolderName: string;
      bankName: string;
      verified: boolean;
      verifiedAt?: Date;
      proofImage?: string;
      verificationData?: any; // Store API response
      verification?: IKYCVerificationMeta;
      verificationHistory?: IKYCVerificationHistoryEntry[];
    };
  };
  completionStatus: {
    personalKycComplete: boolean;
    companyInfoComplete: boolean;
    bankDetailsComplete: boolean;
    agreementComplete: boolean;
  };
  verificationNotes?: string;
  rejectionReason?: string;
  submittedAt?: Date; // Track when KYC was submitted for admin review
  createdAt: Date;
  updatedAt: Date;

  // Soft delete fields
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  schemaVersion: number;
}

// Reusable sub-schemas for verification metadata + history
const verificationSchema = new Schema(
  {
    state: {
      type: String,
      enum: Object.values(DocumentVerificationState),
      default: DocumentVerificationState.NOT_STARTED,
    },
    provider: String,
    verifiedAt: Date,
    expiresAt: Date,
    attemptId: String,
    inputHash: String,
    lastCheckedAt: Date,
    failureReason: String,
    revokedAt: Date,
    data: {
      type: Schema.Types.Mixed,
      required: false,
      validate: {
        validator(v: unknown) {
          if (v == null) return true;
          const size = JSON.stringify(v).length;
          return size <= 1024 * 1024; // 1MB limit
        },
        message: 'Verification data exceeds 1MB limit',
      },
    },
  },
  { _id: false }
);

const verificationHistorySchema = new Schema(
  {
    id: { type: String, required: true },
    state: {
      type: String,
      enum: Object.values(DocumentVerificationState),
      required: true,
    },
    provider: String,
    verifiedAt: Date,
    expiresAt: Date,
    attemptId: String,
    inputHash: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
    reason: String,
  },
  { _id: false }
);

// Create the KYC schema
const KYCSchema = new Schema<IKYC>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    // ✅ FEATURE 10: KYC State Machine
    state: {
      type: String,
      enum: Object.values(KYCState),
      default: KYCState.DRAFT,
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    documents: {
      pan: {
        number: String,
        image: String,
        verified: {
          type: Boolean,
          default: false,
        },
        verifiedAt: Date,
        verificationData: mongoose.Schema.Types.Mixed,
        name: String,
        verification: verificationSchema,
        verificationHistory: {
          type: [verificationHistorySchema],
          validate: [
            arrayLimit(KYC_VERIFICATION_HISTORY_LIMIT),
            `Maximum ${KYC_VERIFICATION_HISTORY_LIMIT} verification history entries`,
          ],
        },
      },
      aadhaar: {
        number: String,
        frontImage: String,
        backImage: String,
        verified: {
          type: Boolean,
          default: false,
        },
        verifiedAt: Date,
        verificationData: mongoose.Schema.Types.Mixed,
        verification: verificationSchema,
        verificationHistory: {
          type: [verificationHistorySchema],
          validate: [
            arrayLimit(KYC_VERIFICATION_HISTORY_LIMIT),
            `Maximum ${KYC_VERIFICATION_HISTORY_LIMIT} verification history entries`,
          ],
        },
      },
      gstin: {
        number: String,
        verified: {
          type: Boolean,
          default: false,
        },
        verifiedAt: Date,
        verificationData: mongoose.Schema.Types.Mixed,
        businessName: String,
        legalName: String,
        status: String,
        registrationType: String,
        businessType: [String],
        addresses: {
          type: [{
            type: {
              type: String
            },
            address: {
              type: String
            },
            businessNature: {
              type: String
            }
          }],
          validate: [
            arrayLimit(50),
            'Maximum 50 GSTIN addresses (prevents unbounded growth for enterprises)',
          ],
        },
        registrationDate: String,
        lastUpdated: String,
        verification: verificationSchema,
        verificationHistory: {
          type: [verificationHistorySchema],
          validate: [
            arrayLimit(KYC_VERIFICATION_HISTORY_LIMIT),
            `Maximum ${KYC_VERIFICATION_HISTORY_LIMIT} verification history entries`,
          ],
        },
      },
      bankAccount: {
        bankAccountId: {
          type: Schema.Types.ObjectId,
          ref: 'SellerBankAccount',
        },
        accountNumber: String,
        ifscCode: String,
        accountHolderName: String,
        bankName: String,
        verified: {
          type: Boolean,
          default: false,
        },
        verifiedAt: Date,
        proofImage: String,
        verificationData: mongoose.Schema.Types.Mixed,
        verification: verificationSchema,
        verificationHistory: {
          type: [verificationHistorySchema],
          validate: [
            arrayLimit(KYC_VERIFICATION_HISTORY_LIMIT),
            `Maximum ${KYC_VERIFICATION_HISTORY_LIMIT} verification history entries`,
          ],
        },
      },
    },
    completionStatus: {
      personalKycComplete: {
        type: Boolean,
        default: false,
      },
      companyInfoComplete: {
        type: Boolean,
        default: false,
      },
      bankDetailsComplete: {
        type: Boolean,
        default: false,
      },
      agreementComplete: {
        type: Boolean,
        default: false,
      },
    },
    verificationNotes: String,
    rejectionReason: String,
    submittedAt: Date, // Track when KYC was submitted for admin review

    // Soft delete fields
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: Date,
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    schemaVersion: {
      type: Number,
      default: 1,
      index: true
    }
  },
  {
    timestamps: true,
  }
);

// Pre-find hook to exclude deleted documents by default
KYCSchema.pre(/^find/, function (this: mongoose.Query<any, any>, next) {
  if ((this as any)._conditions.isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
  next();
});

// Create indexes
KYCSchema.index({ userId: 1 }, { unique: true }); // One KYC per user
KYCSchema.index({ companyId: 1 });
KYCSchema.index({ status: 1 });
KYCSchema.index({ 'documents.pan.number': 1 });
KYCSchema.index({ 'documents.aadhaar.number': 1 });
KYCSchema.index({ 'documents.gstin.number': 1 });

// Compound indexes for common query patterns
KYCSchema.index({ companyId: 1, status: 1 }); // Admin KYC filtering

// ============================================================================
// PHASE 1 CRITICAL: PII Encryption Plugin
// ============================================================================
// Encrypts sensitive Personally Identifiable Information (PII) at rest
// to comply with GDPR, PCI-DSS, and IT Act 2000 regulations
//
// Reference: docs/Backend-Fixes-Suggestions.md, Section 4 - Security: Sensitive Data
// ============================================================================

// Validate encryption key exists at startup
if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 64) {
  throw new Error(
    '❌ ENCRYPTION_KEY must be set in .env file (64+ hex characters).\n' +
    '   Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
}

// Add field-level encryption plugin
// @ts-ignore - mongoose-field-encryption types are not perfectly compatible with Mongoose 8.x
KYCSchema.plugin(fieldEncryption, {
  fields: [
    'documents.pan.number',
    'documents.pan.name',
    'documents.aadhaar.number',
    'documents.bankAccount.accountNumber',
    'documents.bankAccount.accountHolderName',
    'documents.gstin.addresses',
  ],
  secret: process.env.ENCRYPTION_KEY!,
  saltGenerator: () => crypto.randomBytes(32).toString('hex'),
  encryptOnSave: true,  // Automatically encrypt on save
  decryptOnFind: true,  // Automatically decrypt on retrieval
});

// Create and export the KYC model
const KYC = mongoose.model<IKYC>('KYC', KYCSchema);
export default KYC;
