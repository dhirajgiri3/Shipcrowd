import mongoose, { Document, Schema } from 'mongoose';

/**
 * Impersonation Session Model
 * Tracks admin impersonation sessions for audit and security
 */
export interface IImpersonationSession extends Document {
    adminUserId: mongoose.Types.ObjectId;
    targetUserId: mongoose.Types.ObjectId;
    targetCompanyId?: mongoose.Types.ObjectId;
    sessionToken: string;
    startedAt: Date;
    endedAt?: Date;
    isActive: boolean;
    reason: string; // Why impersonation was needed
    ipAddress: string;
    userAgent: string;
    actionsPerformed: Array<{
        action: string;
        resource: string;
        resourceId?: string;
        timestamp: Date;
        metadata?: Record<string, any>;
    }>;
    metadata?: {
        ticketNumber?: string;
        supportRequestId?: string;
        notes?: string;
    };
}

const ImpersonationSessionSchema = new Schema<IImpersonationSession>(
    {
        adminUserId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        targetUserId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        targetCompanyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            index: true,
        },
        sessionToken: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        startedAt: {
            type: Date,
            default: Date.now,
        },
        endedAt: {
            type: Date,
            index: true,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        reason: {
            type: String,
            required: true,
            maxlength: 500,
        },
        ipAddress: {
            type: String,
            required: true,
        },
        userAgent: {
            type: String,
            required: true,
        },
        actionsPerformed: [
            {
                action: {
                    type: String,
                    required: true,
                },
                resource: {
                    type: String,
                    required: true,
                },
                resourceId: String,
                timestamp: {
                    type: Date,
                    default: Date.now,
                },
                metadata: Schema.Types.Mixed,
            },
        ],
        metadata: {
            ticketNumber: String,
            supportRequestId: String,
            notes: String,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for active sessions
ImpersonationSessionSchema.index({ adminUserId: 1, isActive: 1 });
ImpersonationSessionSchema.index({ targetUserId: 1, isActive: 1 });

// TTL index to auto-delete old sessions after 90 days
ImpersonationSessionSchema.index({ startedAt: 1 }, { expireAfterSeconds: 7776000 });

const ImpersonationSession = mongoose.model<IImpersonationSession>(
    'ImpersonationSession',
    ImpersonationSessionSchema
);

export default ImpersonationSession;
