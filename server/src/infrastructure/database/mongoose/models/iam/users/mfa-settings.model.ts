import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';

/**
 * MFA Settings Model
 * Stores Multi-Factor Authentication configuration per user
 *
 * Security Notes:
 * - TOTP secrets are encrypted at rest using field-level encryption
 * - Backup codes are hashed (one-way) - cannot be retrieved, only verified
 * - Each backup code can only be used once
 * - Company-level MFA enforcement tracked separately
 */

export interface IBackupCode {
  code: string; // Hashed value
  usedAt?: Date;
  usedBy?: {
    ip: string;
    userAgent: string;
  };
}

export interface IMFASettings extends Document {
  userId: mongoose.Types.ObjectId;
  companyId?: mongoose.Types.ObjectId;

  // TOTP Configuration
  totpSecret: string; // Encrypted - base32 secret for Google Authenticator
  totpEnabled: boolean;
  preferredMethod: 'totp' | 'backup_code';

  // Backup Codes (hashed)
  backupCodes: IBackupCode[];

  // Enrollment Tracking
  enrolledAt?: Date;
  enrolledBy?: {
    ip: string;
    userAgent: string;
  };

  // Usage Tracking
  lastUsed?: Date;
  lastUsedMethod?: 'totp' | 'backup_code';

  // Security
  isActive: boolean;
  disabledAt?: Date;
  disabledReason?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const MFASettingsSchema = new Schema<IMFASettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // One MFA settings per user
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
    totpSecret: {
      type: String,
      required: true,
      // Will be encrypted by mongoose-field-encryption plugin
    },
    totpEnabled: {
      type: Boolean,
      default: false,
      index: true,
    },
    preferredMethod: {
      type: String,
      enum: ['totp', 'backup_code'],
      default: 'totp',
    },
    backupCodes: [
      {
        code: {
          type: String,
          required: true,
        },
        usedAt: Date,
        usedBy: {
          ip: String,
          userAgent: String,
        },
      },
    ],
    enrolledAt: Date,
    enrolledBy: {
      ip: String,
      userAgent: String,
    },
    lastUsed: Date,
    lastUsedMethod: {
      type: String,
      enum: ['totp', 'backup_code'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    disabledAt: Date,
    disabledReason: String,
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
MFASettingsSchema.index({ userId: 1, isActive: 1 });
MFASettingsSchema.index({ companyId: 1, totpEnabled: 1 });
MFASettingsSchema.index({ createdAt: -1 });

// Apply field-level encryption to TOTP secret
// Using the same encryption key as KYC data
const fieldEncryption = require('mongoose-field-encryption').fieldEncryption;

// @ts-ignore - mongoose-field-encryption types compatibility
MFASettingsSchema.plugin(fieldEncryption, {
  fields: ['totpSecret'],
  secret: process.env.ENCRYPTION_KEY!,
  saltGenerator: () => crypto.randomBytes(8).toString('hex'), // 8 bytes = 16 hex chars
  encryptOnSave: true,
  decryptOnFind: true,
});

// Static method to hash backup codes
MFASettingsSchema.statics.hashBackupCode = function (code: string): string {
  return crypto
    .createHash('sha256')
    .update(code)
    .digest('hex');
};

// Instance method to verify backup code
MFASettingsSchema.methods.verifyBackupCode = function (
  candidateCode: string
): { valid: boolean; codeIndex?: number } {
  const hashedCandidate = crypto
    .createHash('sha256')
    .update(candidateCode)
    .digest('hex');

  for (let i = 0; i < this.backupCodes.length; i++) {
    if (
      this.backupCodes[i].code === hashedCandidate &&
      !this.backupCodes[i].usedAt
    ) {
      return { valid: true, codeIndex: i };
    }
  }

  return { valid: false };
};

const MFASettings = mongoose.model<IMFASettings>(
  'MFASettings',
  MFASettingsSchema
);

export default MFASettings;
