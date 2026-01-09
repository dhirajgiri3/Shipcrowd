import mongoose, { Schema, Document } from 'mongoose';

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

export default mongoose.model<IRecoveryToken>('RecoveryToken', RecoveryTokenSchema);
