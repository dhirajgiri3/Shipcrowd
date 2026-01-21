import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

// Define the interface for Session document
export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  refreshToken: string;
  userAgent: string;
  ip: string;
  deviceInfo: {
    type?: string;
    browser?: string;
    os?: string;
    deviceName?: string;
  };
  location?: {
    country?: string;
    city?: string;
    region?: string;
  };
  lastActive: Date;
  expiresAt: Date;
  isRevoked: boolean;
  // ✅ FEATURE 15: Token Rotation Reuse Detection
  previousToken?: string;
  rotationCount?: number;
  lastRotatedAt?: Date;
  suspiciousActivity?: {
    reuseDetected?: boolean;
    reuseAttemptedAt?: Date;
    reuseIp?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  compareRefreshToken(candidateToken: string): Promise<boolean>;
}

// Create the Session schema
const SessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    refreshToken: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    ip: {
      type: String,
      required: true,
    },
    deviceInfo: {
      type: {
        type: String,
        enum: ['desktop', 'mobile', 'tablet', 'other'],
        default: 'other',
      },
      browser: String,
      os: String,
      deviceName: String,
    },
    location: {
      country: String,
      city: String,
      region: String,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    // ✅ FEATURE 15: Token Rotation Reuse Detection
    previousToken: {
      type: String,
      default: null,
    },
    rotationCount: {
      type: Number,
      default: 0,
    },
    lastRotatedAt: {
      type: Date,
      default: null,
    },
    suspiciousActivity: {
      reuseDetected: {
        type: Boolean,
        default: false,
      },
      reuseAttemptedAt: Date,
      reuseIp: String,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for efficient queries
SessionSchema.index({ userId: 1, isRevoked: 1 });
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for automatic cleanup

// ============================================================================
// PHASE 1 CRITICAL: Hash Refresh Tokens
// ============================================================================
// Hash refresh tokens before storage to prevent session hijacking if DB is breached
// Similar to password hashing - tokens are never stored in plain text
//
// Reference: docs/Backend-Fixes-Suggestions.md, Section 4 - Security: Session Tokens
// ============================================================================

// Hash refresh token before saving (only hash if it's a raw JWT, not already hashed)
SessionSchema.pre('save', async function (next) {
  // Only hash refreshToken if it's not already a bcrypt hash (bcrypt hashes are 60 chars and start with $2)
  if (this.isModified('refreshToken') && !this.refreshToken.startsWith('$2')) {
    this.refreshToken = await bcrypt.hash(this.refreshToken, 12);
  }

  // previousToken should NOT be hashed here - it's already a hash copied from refreshToken
  // The rotation flow copies the already-hashed refreshToken to previousToken
  next();
});

// Method to compare refresh token
SessionSchema.methods.compareRefreshToken = async function (candidateToken: string): Promise<boolean> {
  return bcrypt.compare(candidateToken, this.refreshToken);
};

// Create and export the Session model
const Session = mongoose.model<ISession>('Session', SessionSchema);
export default Session;
