import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import { arrayLimit } from '../../../../shared/utils/arrayValidators';
import { fieldEncryption } from 'mongoose-field-encryption';
import crypto from 'crypto';

// Define the interface for User document
export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'seller' | 'staff';
  companyId?: mongoose.Types.ObjectId;
  teamRole?: 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
  teamStatus?: 'active' | 'invited' | 'suspended';
  // OAuth fields
  googleId?: string;
  oauthProvider?: 'email' | 'google';
  isEmailVerified?: boolean;
  avatar?: string;
  profile: {
    phone?: string;
    avatar?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    dateOfBirth?: Date;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    bio?: string;
    website?: string;
    socialLinks?: {
      facebook?: string;
      twitter?: string;
      linkedin?: string;
      instagram?: string;
    };
    preferredLanguage?: string;
    preferredCurrency?: string;
    timezone?: string;
  };
  profileCompletion?: {
    status: number; // 0-100 percentage
    requiredFieldsCompleted: boolean;
    lastUpdated: Date;
    nextPromptDate?: Date;
  };
  security: {
    tokenVersion?: number;
    verificationToken?: string;
    verificationTokenExpiry?: Date;
    resetToken?: string;
    resetTokenExpiry?: Date;
    lastLogin?: {
      timestamp: Date;
      ip: string;
      userAgent: string;
      success: boolean;
    };
    failedLoginAttempts?: number;
    lockUntil?: Date;
    recoveryOptions?: {
      securityQuestions?: {
        question1: string;
        answer1: string;
        question2: string;
        answer2: string;
        question3: string;
        answer3: string;
        lastUpdated: Date;
      };
      backupEmail?: string;
      backupPhone?: string;
      recoveryKeys?: string[];
      lastUpdated?: Date;
    };
  };
  pendingEmailChange?: {
    email: string;
    token: string;
    tokenExpiry: Date;
  };
  oauth?: {
    google?: {
      id: string;
      email?: string;
      name?: string;
      picture?: string;
      accessToken?: string;
      refreshToken?: string;
    };
  };
  isActive: boolean;
  isDeleted: boolean;
  deactivationReason?: string;
  deletionReason?: string;
  scheduledDeletionDate?: Date;
  anonymized: boolean;
  kycStatus: {
    isComplete: boolean;
    lastUpdated?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Create the User schema
const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true, // This creates an index automatically
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      required: function (this: IUser) {
        return !this.googleId && this.oauthProvider === 'email';
      },
      minlength: 8,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'seller', 'staff'],
      default: 'seller',
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
    },
    teamRole: {
      type: String,
      enum: ['owner', 'admin', 'manager', 'member', 'viewer'],
    },
    teamStatus: {
      type: String,
      enum: ['active', 'invited', 'suspended'],
      default: 'active',
    },
    // OAuth fields
    googleId: {
      type: String,
      sparse: true,
      index: true,
    },
    oauthProvider: {
      type: String,
      enum: ['email', 'google'],
      default: 'email',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    avatar: String,
    profile: {
      phone: String,
      avatar: String,
      address: String,
      city: String,
      state: String,
      country: String,
      postalCode: String,
      dateOfBirth: Date,
      gender: {
        type: String,
        enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      },
      bio: String,
      website: String,
      socialLinks: {
        facebook: String,
        twitter: String,
        linkedin: String,
        instagram: String,
      },
      preferredLanguage: String,
      preferredCurrency: String,
      timezone: String,
    },
    profileCompletion: {
      status: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      requiredFieldsCompleted: {
        type: Boolean,
        default: false,
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
      nextPromptDate: Date,
    },
    security: {
      tokenVersion: {
        type: Number,
        default: 0,
      },
      verificationToken: String,
      verificationTokenExpiry: Date,
      resetToken: String,
      resetTokenExpiry: Date,
      lastLogin: {
        timestamp: {
          type: Date,
        },
        ip: String,
        userAgent: String,
        success: Boolean,
      },
      failedLoginAttempts: {
        type: Number,
        default: 0,
      },
      lockUntil: Date,
      recoveryOptions: {
        securityQuestions: {
          question1: String,
          answer1: String,
          question2: String,
          answer2: String,
          question3: String,
          answer3: String,
          lastUpdated: Date,
        },
        backupEmail: String,
        backupPhone: String,
        recoveryKeys: {
          type: [String],
          validate: [
            arrayLimit(10),
            'Maximum 10 recovery keys (prevents DoS via excessive key generation)',
          ],
        },
        lastUpdated: Date,
      },
    },
    oauth: {
      google: {
        id: String,
        email: String,
        name: String,
        picture: String,
        accessToken: String,
        refreshToken: String,
      },
    },
    pendingEmailChange: {
      email: String,
      token: String,
      tokenExpiry: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deactivationReason: {
      type: String,
    },
    deletionReason: {
      type: String,
    },
    scheduledDeletionDate: {
      type: Date,
    },
    anonymized: {
      type: Boolean,
      default: false,
    },
    kycStatus: {
      isComplete: {
        type: Boolean,
        default: false,
      },
      lastUpdated: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes
// Email index is already created by unique: true
UserSchema.index({ companyId: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isDeleted: 1 });
UserSchema.index({ 'oauth.google.id': 1 });

// Missing indexes for token lookups (prevents full collection scan)
UserSchema.index({ 'security.resetToken': 1 }, { sparse: true });
UserSchema.index({ 'security.verificationToken': 1 }, { sparse: true });
UserSchema.index({ 'pendingEmailChange.token': 1 }, { sparse: true });

// Compound indexes for common query patterns
UserSchema.index({ companyId: 1, teamRole: 1 }); // Team filtering by role
UserSchema.index({ email: 1, isActive: 1 }); // Login queries
UserSchema.index({ companyId: 1, isDeleted: 1, createdAt: -1 }); // Team listing
UserSchema.index({ companyId: 1, teamStatus: 1 }); // Team status filtering

// ============================================================================
// PHASE 1 CRITICAL: OAuth Token Encryption Plugin
// ============================================================================
// Encrypts OAuth access/refresh tokens to prevent account takeover if DB is breached
//
// Reference: docs/Backend-Fixes-Suggestions.md, Section 4 - Security: OAuth Tokens
// ============================================================================

// Add field-level encryption for OAuth tokens (uses same key as KYC encryption)
// @ts-ignore - mongoose-field-encryption types are not perfectly compatible with Mongoose 8.x
UserSchema.plugin(fieldEncryption, {
  fields: [
    'oauth.google.accessToken',
    'oauth.google.refreshToken'
  ],
  secret: process.env.ENCRYPTION_KEY!,
  saltGenerator: () => crypto.randomBytes(16).toString('hex'),
  encryptOnSave: true,
  decryptOnFind: true,
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  const user = this;

  // Skip if password not provided (OAuth users)
  if (!user.password) return next();

  // Only hash the password if it has been modified (or is new)
  if (!user.isModified('password')) return next();

  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password along with the new salt
    const hash = await bcrypt.hash(user.password, salt);
    // Replace the plaintext password with the hash
    user.password = hash;
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Create and export the User model
const User = mongoose.model<IUser>('User', UserSchema);
export default User;
