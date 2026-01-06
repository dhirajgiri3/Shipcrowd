import mongoose, { Schema, Document } from 'mongoose';

/**
 * Magic Link Model
 * Stores passwordless login tokens with 15-minute expiry
 */

export interface IMagicLink extends Document {
    email: string;
    userId: mongoose.Types.ObjectId;
    token: string; // hashed token
    expiresAt: Date;
    usedAt?: Date;
    ip: string;
    userAgent: string;
    createdAt: Date;
    updatedAt: Date;
}

const MagicLinkSchema = new Schema<IMagicLink>(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index: true,
        },
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
        expiresAt: {
            type: Date,
            required: true,
            index: true,
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

// TTL index - automatically delete expired tokens
MagicLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for efficient lookups
MagicLinkSchema.index({ token: 1, expiresAt: 1 });

const MagicLink = mongoose.model<IMagicLink>('MagicLink', MagicLinkSchema);

export default MagicLink;
