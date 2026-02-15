/**
 * Dispute Model
 * 
 * Handles delivery issues, damaged packages, and lost shipments
 * with evidence tracking, timeline management, and SLA enforcement.
 */

import mongoose, { Document, Model, Schema } from 'mongoose';

// ============================================================================
// INTERFACES
// ============================================================================

interface IDisputeEvidence {
    type: 'image' | 'document' | 'video' | 'note';
    url?: string;
    description: string;
    uploadedBy: mongoose.Types.ObjectId;
    uploadedAt: Date;
}

interface IDisputeTimeline {
    action: string;
    performedBy: mongoose.Types.ObjectId;
    timestamp: Date;
    notes?: string;
}

interface IDisputeResolution {
    type: 'refund' | 'replacement' | 'compensation' | 'rejected';
    amount?: number;
    reason: string;
    resolvedBy: mongoose.Types.ObjectId;
    resolvedAt: Date;
}

interface IDisputeCourierResponse {
    status: string;
    remarks: string;
    receivedAt: Date;
}

interface IDisputeSLA {
    deadline: Date;
    escalationDate?: Date;
    isOverdue: boolean;
}

export interface IDispute extends Document {
    disputeId: string;
    shipmentId: mongoose.Types.ObjectId;
    companyId: mongoose.Types.ObjectId;
    orderId?: mongoose.Types.ObjectId; // Reference to order (optional)

    // Dispute Details
    type: 'delivery' | 'damage' | 'lost' | 'other';
    category: 'not_delivered' | 'partial_delivery' | 'damaged_product' |
    'wrong_item' | 'missing_item' | 'lost_in_transit' | 'delayed';

    status: 'pending' | 'investigating' | 'resolved' | 'closed' | 'escalated';
    priority: 'low' | 'medium' | 'high' | 'urgent';

    description: string;

    // Customer Information (denormalized for quick reference)
    customerDetails?: {
        name: string;
        phone: string;
        email?: string;
    };

    // Evidence
    evidence: IDisputeEvidence[];

    // Timeline
    timeline: IDisputeTimeline[];

    // Resolution
    resolution?: IDisputeResolution;

    // Courier Details
    courierResponse?: IDisputeCourierResponse;

    // Financial Impact (if applicable)
    financialImpact?: {
        orderValue: number;
        refundAmount?: number;
        compensationAmount?: number;
        currency: string;
    };

    // SLA
    sla: IDisputeSLA;

    // Metadata
    assignedTo?: mongoose.Types.ObjectId; // Admin user handling this dispute
    tags?: string[]; // For categorization (e.g., 'high_value', 'repeat_customer')

    // Soft Delete
    isDeleted: boolean;
    deletedAt?: Date;
    deletedBy?: mongoose.Types.ObjectId;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

export interface IDisputeModel extends Model<IDispute> {
    generateDisputeId(): Promise<string>;
}

// ============================================================================
// SCHEMA
// ============================================================================

const DisputeEvidenceSchema = new Schema<IDisputeEvidence>({
    type: {
        type: String,
        enum: ['image', 'document', 'video', 'note'],
        required: true,
    },
    url: {
        type: String,
    },
    description: {
        type: String,
        required: true,
    },
    uploadedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    uploadedAt: {
        type: Date,
        default: Date.now,
    },
}, { _id: false });

const DisputeTimelineSchema = new Schema<IDisputeTimeline>({
    action: {
        type: String,
        required: true,
    },
    performedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    notes: {
        type: String,
    },
}, { _id: false });

const DisputeResolutionSchema = new Schema<IDisputeResolution>({
    type: {
        type: String,
        enum: ['refund', 'replacement', 'compensation', 'rejected'],
        required: true,
    },
    amount: {
        type: Number,
    },
    reason: {
        type: String,
        required: true,
    },
    resolvedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    resolvedAt: {
        type: Date,
        default: Date.now,
    },
}, { _id: false });

const DisputeCourierResponseSchema = new Schema<IDisputeCourierResponse>({
    status: {
        type: String,
        required: true,
    },
    remarks: {
        type: String,
        required: true,
    },
    receivedAt: {
        type: Date,
        default: Date.now,
    },
}, { _id: false });

const DisputeSLASchema = new Schema<IDisputeSLA>({
    deadline: {
        type: Date,
        required: true,
    },
    escalationDate: {
        type: Date,
    },
    isOverdue: {
        type: Boolean,
        default: false,
    },
}, { _id: false });

const DisputeSchema = new Schema<IDispute, IDisputeModel>(
    {
        disputeId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        shipmentId: {
            type: Schema.Types.ObjectId,
            ref: 'Shipment',
            required: true,
            index: true,
        },
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
        },
        type: {
            type: String,
            enum: ['delivery', 'damage', 'lost', 'other'],
            required: true,
        },
        category: {
            type: String,
            enum: [
                'not_delivered',
                'partial_delivery',
                'damaged_product',
                'wrong_item',
                'missing_item',
                'lost_in_transit',
                'delayed',
            ],
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'investigating', 'resolved', 'closed', 'escalated'],
            default: 'pending',
            index: true,
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'urgent'],
            default: 'medium',
            index: true,
        },
        description: {
            type: String,
            required: true,
        },
        customerDetails: {
            name: { type: String },
            phone: { type: String },
            email: { type: String },
        },
        evidence: [DisputeEvidenceSchema],
        timeline: [DisputeTimelineSchema],
        resolution: DisputeResolutionSchema,
        courierResponse: DisputeCourierResponseSchema,
        financialImpact: {
            orderValue: { type: Number },
            refundAmount: { type: Number },
            compensationAmount: { type: Number },
            currency: { type: String, default: 'INR' },
        },
        sla: {
            type: DisputeSLASchema,
            required: true,
        },
        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        tags: [{ type: String }],
        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },
        deletedAt: {
            type: Date,
        },
        deletedBy: {
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

DisputeSchema.index({ companyId: 1, createdAt: -1 });
DisputeSchema.index({ status: 1, priority: 1 });
DisputeSchema.index({ 'sla.deadline': 1 });
DisputeSchema.index({ 'sla.isOverdue': 1, status: 1 });
DisputeSchema.index({ isDeleted: 1, companyId: 1 });
DisputeSchema.index({ assignedTo: 1, status: 1 });
DisputeSchema.index({ tags: 1 });

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Generate unique dispute ID
 * Format: DIS-YYYYMMDD-XXXXX
 */
DisputeSchema.statics.generateDisputeId = async function (): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const todayCount = await this.countDocuments({
        createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const sequence = (todayCount + 1).toString().padStart(5, '0');
    return `DIS-${dateStr}-${sequence}`;
};

// ============================================================================
// EXPORT
// ============================================================================

const Dispute = mongoose.model<IDispute, IDisputeModel>('Dispute', DisputeSchema);

export default Dispute;
