/**
 * Consent Model
 * 
 * Purpose: Track user consent for GDPR compliance
 * Stores consent for terms, privacy policy, marketing, and cookies
 * 
 * GDPR Requirements:
 * - Record when consent was given
 * - Record what version of terms was accepted
 * - Allow withdrawal of consent
 * - Track consent history
 */

import mongoose, { Document, Schema, Types } from 'mongoose';

// Consent types
export type ConsentType = 'terms' | 'privacy' | 'marketing' | 'cookies' | 'data_processing';

// Consent document interface
export interface IConsent extends Document {
    userId: Types.ObjectId;
    type: ConsentType;
    version: string;
    accepted: boolean;
    acceptedAt?: Date;
    withdrawnAt?: Date;
    ip: string;
    userAgent: string;
    source: 'registration' | 'settings' | 'banner' | 'api';
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

// Consent history for audit trail
export interface IConsentHistory extends Document {
    userId: Types.ObjectId;
    consentId: Types.ObjectId;
    action: 'accepted' | 'withdrawn' | 'updated';
    type: ConsentType;
    version: string;
    previousVersion?: string;
    ip: string;
    userAgent: string;
    createdAt: Date;
}

// Consent Schema
const ConsentSchema = new Schema<IConsent>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ['terms', 'privacy', 'marketing', 'cookies', 'data_processing'],
            required: true,
        },
        version: {
            type: String,
            required: true,
            default: '1.0',
        },
        accepted: {
            type: Boolean,
            required: true,
            default: false,
        },
        acceptedAt: {
            type: Date,
        },
        withdrawnAt: {
            type: Date,
        },
        ip: {
            type: String,
            required: true,
        },
        userAgent: {
            type: String,
            required: true,
        },
        source: {
            type: String,
            enum: ['registration', 'settings', 'banner', 'api'],
            required: true,
            default: 'registration',
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for unique consent per type per user
ConsentSchema.index({ userId: 1, type: 1 }, { unique: true });

// Consent History Schema
const ConsentHistorySchema = new Schema<IConsentHistory>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        consentId: {
            type: Schema.Types.ObjectId,
            ref: 'Consent',
            required: true,
        },
        action: {
            type: String,
            enum: ['accepted', 'withdrawn', 'updated'],
            required: true,
        },
        type: {
            type: String,
            enum: ['terms', 'privacy', 'marketing', 'cookies', 'data_processing'],
            required: true,
        },
        version: {
            type: String,
            required: true,
        },
        previousVersion: {
            type: String,
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

// Virtual for checking if consent is valid
ConsentSchema.virtual('isValid').get(function () {
    return this.accepted && !this.withdrawnAt;
});

// Static method to get user's current consents
ConsentSchema.statics.getUserConsents = async function (
    userId: Types.ObjectId
): Promise<IConsent[]> {
    return this.find({ userId }).sort({ type: 1 });
};

// Static method to check if user has accepted required consents
ConsentSchema.statics.hasRequiredConsents = async function (
    userId: Types.ObjectId
): Promise<boolean> {
    const requiredTypes: ConsentType[] = ['terms', 'privacy'];
    const consents = await this.find({
        userId,
        type: { $in: requiredTypes },
        accepted: true,
        withdrawnAt: null,
    });
    return consents.length === requiredTypes.length;
};

// Instance method to withdraw consent
ConsentSchema.methods.withdraw = async function (ip: string, userAgent: string) {
    this.accepted = false;
    this.withdrawnAt = new Date();
    await this.save();

    // Record in history
    await ConsentHistory.create({
        userId: this.userId,
        consentId: this._id,
        action: 'withdrawn',
        type: this.type,
        version: this.version,
        ip,
        userAgent,
    });
};

export const Consent = mongoose.model<IConsent>('Consent', ConsentSchema);
export const ConsentHistory = mongoose.model<IConsentHistory>('ConsentHistory', ConsentHistorySchema);

export default { Consent, ConsentHistory };
