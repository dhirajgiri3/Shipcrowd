/**
 * Blacklist Model
 * 
 * Manages blacklisted entities (phone, email, address, IP).
 * Supports temporary and permanent blocks with expiration.
 */

import mongoose, { Document, Schema } from 'mongoose';

// ============================================================================
// INTERFACES
// ============================================================================

export interface IBlacklist extends Document {
    type: 'phone' | 'email' | 'address' | 'ip';
    value: string;                          // The blacklisted value
    normalizedValue: string;                // Normalized for matching

    // Block Details
    reason: string;
    severity: 'low' | 'medium' | 'high';
    source: 'system' | 'manual' | 'ai';

    // Expiration
    expiresAt?: Date;                       // For temporary blocks
    isPermanent: boolean;

    // Metadata
    metadata: {
        ordersBlocked: number;
        lastAttempt?: Date;
        relatedAlerts: mongoose.Types.ObjectId[];
        notes?: string;
    };

    // Audit
    createdBy: mongoose.Types.ObjectId | 'system';
    updatedBy?: mongoose.Types.ObjectId;

    createdAt: Date;
    updatedAt: Date;

    // Methods
    isActive(): boolean;
    recordBlock(): Promise<void>;
}

// Model interface with static methods
export interface IBlacklistModel extends mongoose.Model<IBlacklist> {
    normalizeValue(type: string, value: string): string;
}

// ============================================================================
// SCHEMA
// ============================================================================

const BlacklistSchema = new Schema<IBlacklist>(
    {
        type: {
            type: String,
            enum: ['phone', 'email', 'address', 'ip'],
            required: true,
            index: true,
        },
        value: {
            type: String,
            required: true,
        },
        normalizedValue: {
            type: String,
            required: true,
            index: true,
        },

        // Block Details
        reason: {
            type: String,
            required: true,
        },
        severity: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium',
            index: true,
        },
        source: {
            type: String,
            enum: ['system', 'manual', 'ai'],
            default: 'manual',
        },

        // Expiration
        expiresAt: {
            type: Date,
        },
        isPermanent: {
            type: Boolean,
            default: false,
        },

        // Metadata
        metadata: {
            ordersBlocked: {
                type: Number,
                default: 0,
            },
            lastAttempt: Date,
            relatedAlerts: [{
                type: Schema.Types.ObjectId,
                ref: 'FraudAlert',
            }],
            notes: String,
        },

        // Audit
        createdBy: {
            type: Schema.Types.Mixed,
            required: true,
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

// ============================================================================
// INDEXES
// ============================================================================

BlacklistSchema.index({ type: 1, normalizedValue: 1 }, { unique: true });
BlacklistSchema.index({ expiresAt: 1 }, { sparse: true });
BlacklistSchema.index({ isPermanent: 1 });

// ============================================================================
// METHODS
// ============================================================================

/**
 * Check if blacklist entry is still active
 */
BlacklistSchema.methods.isActive = function (): boolean {
    if (this.isPermanent) return true;
    if (!this.expiresAt) return true;
    return new Date() < this.expiresAt;
};

/**
 * Record a blocked attempt
 */
BlacklistSchema.methods.recordBlock = async function (): Promise<void> {
    this.metadata.ordersBlocked += 1;
    this.metadata.lastAttempt = new Date();
    await this.save();
};

/**
 * Normalize value for consistent matching
 */
BlacklistSchema.statics.normalizeValue = function (type: string, value: string): string {
    switch (type) {
        case 'phone':
            // Remove all non-digits
            return value.replace(/\D/g, '');
        case 'email':
            // Lowercase and trim
            return value.toLowerCase().trim();
        case 'address':
            // Lowercase, remove extra spaces, remove punctuation
            return value.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
        case 'ip':
            // Just trim
            return value.trim();
        default:
            return value.trim();
    }
};

// ============================================================================
// PRE-SAVE HOOK
// ============================================================================

BlacklistSchema.pre('save', function (next) {
    // Auto-normalize value
    if (this.isModified('value')) {
        this.normalizedValue = (this.constructor as any).normalizeValue(this.type, this.value);
    }
    next();
});

// ============================================================================
// EXPORT
// ============================================================================

export default mongoose.model<IBlacklist, IBlacklistModel>('Blacklist', BlacklistSchema);
