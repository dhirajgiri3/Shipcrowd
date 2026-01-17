/**
 * Fraud Alert Model
 * 
 * Tracks fraud alerts generated from order analysis.
 * Supports investigation workflow and resolution tracking.
 */

import mongoose, { Schema, Document } from 'mongoose';

// ============================================================================
// INTERFACES
// ============================================================================

export interface IFraudAlert extends Document {
    alertId: string;                        // Unique alert ID (FRD-YYYYMMDD-XXXXX)
    orderId?: mongoose.Types.ObjectId;      // Related order (if applicable)
    companyId: mongoose.Types.ObjectId;     // Company being flagged
    customerId?: mongoose.Types.ObjectId;   // Customer being flagged

    // Risk Assessment
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    fraudScore: number;                     // 0-100
    confidence: number;                     // 0-1 (AI confidence)

    // Detection Details
    matchedRules: Array<{
        ruleId: mongoose.Types.ObjectId;
        ruleName: string;
        weight: number;
        matched: boolean;
    }>;

    blacklistMatches: Array<{
        type: 'phone' | 'email' | 'address' | 'ip';
        value: string;
        blacklistId: mongoose.Types.ObjectId;
    }>;

    aiAnalysis?: {
        summary: string;
        indicators: string[];
        recommendation: 'approve' | 'review' | 'block';
        confidence: number;
    };

    // Investigation
    status: 'pending' | 'investigating' | 'resolved' | 'false_positive';
    assignedTo?: mongoose.Types.ObjectId;   // Admin/fraud team member
    investigationNotes?: string;

    // Resolution
    resolution?: {
        action: 'approved' | 'blocked' | 'flagged' | 'dismissed';
        reason: string;
        resolvedBy: mongoose.Types.ObjectId;
        resolvedAt: Date;
    };

    // Metadata
    metadata: {
        orderData?: any;                    // Snapshot of order data
        customerHistory?: {
            totalOrders: number;
            accountAge: number;             // Days
            previousFlags: number;
        };
        ipAddress?: string;
        userAgent?: string;
    };

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

// Model interface with static methods
export interface IFraudAlertModel extends mongoose.Model<IFraudAlert> {
    generateAlertId(): Promise<string>;
}

// ============================================================================
// SCHEMA
// ============================================================================

const FraudAlertSchema = new Schema<IFraudAlert>(
    {
        alertId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
            index: true,
        },
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },
        customerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            index: true,
        },

        // Risk Assessment
        riskLevel: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            required: true,
            index: true,
        },
        fraudScore: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        },
        confidence: {
            type: Number,
            min: 0,
            max: 1,
            default: 0,
        },

        // Detection Details
        matchedRules: [{
            ruleId: {
                type: Schema.Types.ObjectId,
                ref: 'FraudRule',
            },
            ruleName: String,
            weight: Number,
            matched: Boolean,
        }],

        blacklistMatches: [{
            type: {
                type: String,
                enum: ['phone', 'email', 'address', 'ip'],
            },
            value: String,
            blacklistId: {
                type: Schema.Types.ObjectId,
                ref: 'Blacklist',
            },
        }],

        aiAnalysis: {
            summary: String,
            indicators: [String],
            recommendation: {
                type: String,
                enum: ['approve', 'review', 'block'],
            },
            confidence: Number,
        },

        // Investigation
        status: {
            type: String,
            enum: ['pending', 'investigating', 'resolved', 'false_positive'],
            default: 'pending',
            index: true,
        },
        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        investigationNotes: String,

        // Resolution
        resolution: {
            action: {
                type: String,
                enum: ['approved', 'blocked', 'flagged', 'dismissed'],
            },
            reason: String,
            resolvedBy: {
                type: Schema.Types.ObjectId,
                ref: 'User',
            },
            resolvedAt: Date,
        },

        // Metadata
        metadata: {
            orderData: Schema.Types.Mixed,
            customerHistory: {
                totalOrders: Number,
                accountAge: Number,
                previousFlags: Number,
            },
            ipAddress: String,
            userAgent: String,
        },
    },
    {
        timestamps: true,
    }
);

// ============================================================================
// INDEXES
// ============================================================================

FraudAlertSchema.index({ createdAt: -1 });
FraudAlertSchema.index({ riskLevel: 1, status: 1 });
FraudAlertSchema.index({ companyId: 1, createdAt: -1 });

// ============================================================================
// METHODS
// ============================================================================

/**
 * Generate unique alert ID
 */
FraudAlertSchema.statics.generateAlertId = async function (): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const todayCount = await this.countDocuments({
        createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const sequence = (todayCount + 1).toString().padStart(5, '0');
    return `FRD-${dateStr}-${sequence}`;
};

// ============================================================================
// EXPORT
// ============================================================================

export default mongoose.model<IFraudAlert, IFraudAlertModel>('FraudAlert', FraudAlertSchema);
