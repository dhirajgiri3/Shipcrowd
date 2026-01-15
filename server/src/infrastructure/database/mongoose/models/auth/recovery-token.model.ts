import mongoose, { Schema, Document, Model } from 'mongoose';
import crypto from 'crypto';

/**
 * Recovery Token Model
 * For account recovery when users are locked out or need to regain access
 * Tokens expire after 4 hours
 */
export interface IRecoveryToken extends Document {
    userId: mongoose.Types.ObjectId;
    token: string; // hashed with SHA-256
    method: 'email' | 'phone';
    expiresAt: Date;
    usedAt?: Date;
    ip: string;
    userAgent: string;
    createdAt: Date;
    updatedAt: Date;
}

const RecoveryTokenSchema = new Schema<IRecoveryToken>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        token: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        method: {
            type: String,
            enum: ['email', 'phone'],
            default: 'email',
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        usedAt: {
            type: Date,
            default: null,
        },
        ip: {
            type: String,
            required: true,
        },
        userAgent: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
RecoveryTokenSchema.index({ token: 1, expiresAt: 1 });
RecoveryTokenSchema.index({ userId: 1, createdAt: -1 });

// TTL index - automatically delete expired tokens after they expire
RecoveryTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for verification queries
RecoveryTokenSchema.index(
    { token: 1, expiresAt: 1, usedAt: 1 },
    { name: 'recovery_verification_idx' }
);

// ============================================================================
// TOKEN HASHING
// ============================================================================
// Security improvement: Hash tokens with SHA-256 before storing in database
// This prevents token leakage if database is compromised
// ============================================================================

// Define model interface with static methods
interface IRecoveryTokenModel extends Model<IRecoveryToken> {
    hashToken(token: string): string;
}

/**
 * Static method to hash tokens with SHA-256
 * @param token - Plain text token to hash
 * @returns 64-character hex string (SHA-256 hash)
 */
RecoveryTokenSchema.statics.hashToken = function (token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Pre-save hook to automatically hash token
 * Only hashes if token is new/modified and not already hashed (SHA-256 = 64 hex chars)
 */
RecoveryTokenSchema.pre('save', function (next) {
    // Only hash if token is new/modified and not already a 64-char hex string
    if (this.isModified('token') && this.token.length !== 64) {
        this.token = crypto.createHash('sha256').update(this.token).digest('hex');
    }
    next();
});

export default mongoose.model<IRecoveryToken, IRecoveryTokenModel>('RecoveryToken', RecoveryTokenSchema);
