import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import { arrayLimit } from '../../../../../../shared/utils/arrayValidators';
import { fieldEncryption } from 'mongoose-field-encryption';
import crypto from 'crypto';
import logger from '../../../../../../shared/logger/winston.logger';

// Define the interface for User document
export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: 'super_admin' | 'admin' | 'seller' | 'staff';
  companyId?: mongoose.Types.ObjectId; // Admin with company = dual role (admin + seller)
  teamRole?: 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
  teamStatus?: 'active' | 'invited' | 'suspended';
  // ✅ V5 RBAC: Platform Role (replaces role enum)
  platformRole?: mongoose.Types.ObjectId;
  // ✅ FEATURE 5: Tiered Access
  accessTier: 'explorer' | 'sandbox' | 'production';
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
    // ✅ FEATURE 8: Device Tracking
    trustedDevices?: {
      deviceId: string;
      userAgent?: string;
      ip?: string;
      lastActive: Date;
      addedAt: Date;
    }[];
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
  // Admin suspension/ban
  isSuspended?: boolean;
  suspensionReason?: string;
  suspendedAt?: Date;
  suspendedBy?: mongoose.Types.ObjectId;
  suspensionExpiresAt?: Date;
  isBanned?: boolean;
  bannedAt?: Date;
  bannedBy?: mongoose.Types.ObjectId;
  banReason?: string;
  kycStatus: {
    isComplete: boolean;
    lastUpdated?: Date;
  };
  // Progressive verification system
  verificationLevel: 0 | 1 | 2 | 3;
  onboardingStep: 'email_verification' | 'business_profile' | 'kyc_submission' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  compareSecurityAnswer(answerNum: 1 | 2 | 3, candidateAnswer: string): Promise<boolean>;
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
      enum: ['super_admin', 'admin', 'seller', 'staff'],
      default: 'seller', // New users default to seller
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
    // ✅ V5 RBAC: Platform Role (ref to Role model)
    platformRole: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
    },
    // ✅ FEATURE 5: Tiered Access
    accessTier: {
      type: String,
      enum: ['explorer', 'sandbox', 'production'],
      default: 'explorer',
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
      // ✅ FEATURE 8: Device Tracking Schema
      trustedDevices: [{
        deviceId: { type: String, required: true }, // UUID or hash of UA+IP
        userAgent: String,
        ip: String,
        lastActive: Date,
        addedAt: { type: Date, default: Date.now }
      }],
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
    // Admin suspension/ban fields
    isSuspended: {
      type: Boolean,
      default: false,
      index: true,
    },
    suspensionReason: String,
    suspendedAt: Date,
    suspendedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    suspensionExpiresAt: {
      type: Date,
      index: true, // For auto-unsuspension queries
    },
    isBanned: {
      type: Boolean,
      default: false,
      index: true,
    },
    bannedAt: Date,
    bannedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    banReason: String,
    kycStatus: {
      isComplete: {
        type: Boolean,
        default: false,
      },
      lastUpdated: Date,
    },
    // Progressive verification system
    verificationLevel: {
      type: Number,
      enum: [0, 1, 2, 3],
      default: 0,
      index: true,
    },
    onboardingStep: {
      type: String,
      enum: ['email_verification', 'business_profile', 'kyc_submission', 'completed'],
      default: 'email_verification',
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
    // Generate a salt with 12 rounds (increased from 10 for better security)
    const salt = await bcrypt.genSalt(12);
    // Hash the password along with the new salt
    const hash = await bcrypt.hash(user.password, salt);
    // Replace the plaintext password with the hash
    user.password = hash;
    next();
  } catch (error: any) {
    next(error);
  }
});

// Hash security question answers before saving
UserSchema.pre('save', async function (next) {
  const user = this;

  // Only process if security questions exist
  if (!user.security?.recoveryOptions?.securityQuestions) {
    return next();
  }

  const sq = user.security.recoveryOptions.securityQuestions;

  try {
    // Hash answer1 if modified and not already hashed (bcrypt hashes start with $2b$)
    if (user.isModified('security.recoveryOptions.securityQuestions.answer1') &&
      sq.answer1 && !sq.answer1.startsWith('$2b$')) {
      const normalized = sq.answer1.toLowerCase().trim();
      sq.answer1 = await bcrypt.hash(normalized, 12);
    }

    // Hash answer2 if modified
    if (user.isModified('security.recoveryOptions.securityQuestions.answer2') &&
      sq.answer2 && !sq.answer2.startsWith('$2b$')) {
      const normalized = sq.answer2.toLowerCase().trim();
      sq.answer2 = await bcrypt.hash(normalized, 12);
    }

    // Hash answer3 if modified
    if (user.isModified('security.recoveryOptions.securityQuestions.answer3') &&
      sq.answer3 && !sq.answer3.startsWith('$2b$')) {
      const normalized = sq.answer3.toLowerCase().trim();
      sq.answer3 = await bcrypt.hash(normalized, 12);
    }

    next();
  } catch (error: any) {
    next(error);
  }
});

// ============================================================================
// CRITICAL V5 RBAC: Bidirectional Sync Hook (pre('save'))
// ============================================================================
// When legacy fields (role, companyId, teamRole) change, automatically update
// V5 RBAC models (platformRole, Membership) to keep systems synchronized.
// ============================================================================
UserSchema.pre('save', async function(next) {
  // Skip if new document (handled by registration flow)
  if (this.isNew) return next();

  try {
    const Role = mongoose.model('Role');
    const Membership = mongoose.model('Membership');

    // 1. Sync platformRole when role changes
    if (this.isModified('role')) {
      const roleMap: Record<string, string> = {
        'super_admin': 'super_admin',
        'admin': 'admin',
        'seller': 'user',
        'staff': 'user'
      };

      const globalRole = await Role.findOne({
        name: roleMap[this.role as string],
        scope: 'global'
      }).lean() as any;

      if (globalRole) {
        this.platformRole = globalRole._id;
        logger.info(`[Sync] Updated platformRole for user ${this._id}: ${this.role} → ${globalRole.name}`);
      }
    }

    // 2. Sync Membership when companyId or teamRole changes
    if (this.isModified('companyId') || this.isModified('teamRole')) {
      if (this.companyId && this.teamRole) {
        // Map teamRole to Role
        const teamRoleMap: Record<string, string> = {
          'owner': 'owner',
          'admin': 'manager',
          'manager': 'manager',
          'member': 'member',
          'viewer': 'viewer'
        };

        const companyRole = await Role.findOne({
          name: teamRoleMap[this.teamRole as string] || 'member',
          scope: 'company'
        }).lean() as any;

        if (companyRole) {
          // Upsert membership
          await Membership.findOneAndUpdate(
            { userId: this._id, companyId: this.companyId },
            {
              roles: [companyRole._id],
              status: this.teamStatus || 'active',
              $inc: { permissionsVersion: 1 }
            },
            { upsert: true, new: true }
          );

          logger.info(`[Sync] Updated Membership for user ${this._id} in company ${this.companyId}: ${this.teamRole} → ${companyRole.name}`);
        }
      } else if (!this.companyId) {
        // User left company - mark all memberships as suspended
        await Membership.updateMany(
          { userId: this._id },
          { status: 'suspended', $inc: { permissionsVersion: 1 } }
        );
      }
    }

    // 3. Note: Cache invalidation handled separately via controller/middleware
    // to avoid circular dependencies

    next();
  } catch (error) {
    logger.error('[Sync] User save hook failed:', error);
    next(error as Error);
  }
});

// ============================================================================
// CRITICAL V5 RBAC: Prevent Last Owner Removal (pre('save'))
// ============================================================================
// Ensure every company has at least one active owner. Prevent changing role
// of the last owner away from 'owner' status.
// ============================================================================
UserSchema.pre('save', async function(next) {
  if (!this.isModified('teamRole') && !this.isModified('companyId')) {
    return next();
  }

  try {
    // If user was owner and is being changed
    const oldUser = await mongoose.model('User').findById(this._id).select('teamRole companyId').lean() as any;

    if (oldUser?.teamRole === 'owner' && this.teamRole !== 'owner' && this.companyId) {
      // Check if other active owners exist
      const otherOwners = await mongoose.model('User').countDocuments({
        companyId: this.companyId,
        teamRole: 'owner',
        _id: { $ne: this._id },
        isActive: true
      });

      if (otherOwners === 0) {
        return next(new Error('Cannot change role of last owner. Transfer ownership first.'));
      }
    }

    next();
  } catch (error) {
    logger.error('[Ownership] Last owner protection check failed:', error);
    next(error as Error);
  }
});

// ============================================================================
// CRITICAL V5 RBAC: Sync Hook for findOneAndUpdate (pre('findOneAndUpdate'))
// ============================================================================
// CRITICAL FIX: Controllers use User.findByIdAndUpdate() which bypasses
// pre('save') hooks. This hook ensures sync happens even with findByIdAndUpdate.
//
// Affected controllers:
// - company.controller.ts:111 - Sets companyId and teamRole
// - kyc.controller.ts:281 - Safe (updates kycStatus only)
// - user.controller.ts:89 - Safe (profile fields only)
// ============================================================================
UserSchema.pre('findOneAndUpdate', async function(next) {
  try {
    const update = this.getUpdate() as any;
    const Role = mongoose.model('Role');
    const Membership = mongoose.model('Membership');

    // Check if role/companyId/teamRole fields are being updated
    const updatingRole = update.role || update.$set?.role;
    const updatingCompanyId = update.companyId !== undefined || update.$set?.companyId !== undefined;
    const updatingTeamRole = update.teamRole || update.$set?.teamRole;

    if (!updatingRole && !updatingCompanyId && !updatingTeamRole) {
      return next(); // No sync needed
    }

    // Get current user document
    const query = this.getQuery() as any;
    const userId = query._id;
    const user = await mongoose.model('User').findById(userId).lean() as any;

    if (!user) return next();

    // 1. Sync platformRole if role changed
    if (updatingRole) {
      const roleMap: Record<string, string> = {
        'super_admin': 'super_admin',
        'admin': 'admin',
        'seller': 'user',
        'staff': 'user'
      };

      const newRole = updatingRole;
      const globalRole = await Role.findOne({
        name: roleMap[newRole],
        scope: 'global'
      }).lean() as any;

      if (globalRole) {
        if (!update.$set) update.$set = {};
        update.$set.platformRole = globalRole._id;
        logger.info(`[Sync-Update] Set platformRole for user ${userId}: ${newRole} → ${globalRole.name}`);
      }
    }

    // 2. Sync Membership if companyId/teamRole changed
    const newCompanyId = updatingCompanyId ? (update.companyId || update.$set?.companyId) : user.companyId;
    const newTeamRole = updatingTeamRole ? (update.teamRole || update.$set?.teamRole) : user.teamRole;

    if (newCompanyId && newTeamRole) {
      const teamRoleMap: Record<string, string> = {
        'owner': 'owner',
        'admin': 'manager',
        'manager': 'manager',
        'member': 'member',
        'viewer': 'viewer'
      };

      const companyRole = await Role.findOne({
        name: teamRoleMap[newTeamRole] || 'member',
        scope: 'company'
      }).lean() as any;

      if (companyRole) {
        await Membership.findOneAndUpdate(
          { userId, companyId: newCompanyId },
          {
            roles: [companyRole._id],
            status: 'active',
            $inc: { permissionsVersion: 1 }
          },
          { upsert: true }
        );
        logger.info(`[Sync-Update] Updated Membership for user ${userId}`);
      }
    }

    next();
  } catch (error) {
    logger.error('[Sync-Update] findOneAndUpdate hook failed:', error);
    next(error as Error);
  }
});

// ============================================================================
// CRITICAL V5 RBAC: Cache Invalidation (post hooks)
// ============================================================================
// Invalidate permission cache after role-related changes.
// Uses direct Redis pub/sub to avoid circular import with PermissionService.
// ============================================================================

// Lazy-loaded Redis client for cache invalidation
let invalidationRedis: any = null;
const RBAC_CHANNEL = 'rbac:invalidation';

async function invalidatePermissionCache(userId: string, companyId?: string): Promise<void> {
  try {
    if (!invalidationRedis) {
      const ioredis = await import('ioredis');
      const RedisClient = ioredis.default || ioredis;
      invalidationRedis = new (RedisClient as any)(process.env.REDIS_URL || 'redis://localhost:6379');
    }

    // Delete local cache keys
    const pattern = `rbac:perms:${userId}:${companyId || '*'}`;
    const keys: string[] = [];

    for await (const keyBatch of invalidationRedis.scanStream({ match: pattern, count: 100 })) {
      keys.push(...keyBatch);
    }

    if (keys.length > 0) {
      await invalidationRedis.del(...keys);
    }

    // Publish to other nodes
    await invalidationRedis.publish(RBAC_CHANNEL, JSON.stringify({ userId, companyId }));

    logger.debug(`[Cache] Invalidated permissions for user ${userId}`);
  } catch (error) {
    logger.warn('[Cache] Failed to invalidate:', error);
  }
}

UserSchema.post('save', async function() {
  // Only invalidate if role-related fields were modified
  if (this.isModified('role') || this.isModified('companyId') || this.isModified('teamRole')) {
    await invalidatePermissionCache(
      (this._id as mongoose.Types.ObjectId).toString(),
      this.companyId?.toString()
    );
  }
});

UserSchema.post('findOneAndUpdate', async function(doc) {
  if (doc) {
    await invalidatePermissionCache(
      (doc._id as mongoose.Types.ObjectId).toString(),
      doc.companyId?.toString()
    );
  }
});


// Method to compare password
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Compare security question answer
 * @param answerNum - Which answer to compare (1, 2, or 3)
 * @param candidateAnswer - User-provided answer to verify
 * @returns Promise<boolean> - True if answer matches
 */
UserSchema.methods.compareSecurityAnswer = async function (
  answerNum: 1 | 2 | 3,
  candidateAnswer: string
): Promise<boolean> {
  const sq = this.security?.recoveryOptions?.securityQuestions;
  if (!sq) return false;

  const hashedAnswer = sq[`answer${answerNum}` as 'answer1' | 'answer2' | 'answer3'];
  if (!hashedAnswer) return false;

  // Normalize candidate answer (lowercase, trim) to match pre-save hook normalization
  const normalized = candidateAnswer.toLowerCase().trim();

  return bcrypt.compare(normalized, hashedAnswer);
};


// Create and export the User model
const User = mongoose.model<IUser>('User', UserSchema);
export default User;
