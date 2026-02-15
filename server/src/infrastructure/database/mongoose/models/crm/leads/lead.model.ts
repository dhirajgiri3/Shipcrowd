import mongoose, { Document, Model, Schema } from 'mongoose';

/**
 * Lead Model (Stub for Future Enhancement)
 * 
 * Tracks sales leads assigned to sales representatives.
 * This is a placeholder for future CRM-like functionality.
 */

// Lead source types
export type LeadSource = 'website' | 'referral' | 'cold-call' | 'event' | 'social-media' | 'other';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

// Lead interface
export interface ILead extends Document {
    company: mongoose.Types.ObjectId;
    salesRepresentative: mongoose.Types.ObjectId;
    name: string;
    email?: string;
    phone: string;
    companyName?: string;
    source: LeadSource;
    status: LeadStatus;
    estimatedValue?: number;
    actualValue?: number;
    convertedToOrder?: mongoose.Types.ObjectId;
    conversionDate?: Date;
    notes?: string;
    tags?: string[];
    nextFollowUp?: Date;
    lastContactedAt?: Date;
    metadata?: Record<string, unknown>;
    territory?: string;
    score: number;
    relatedSupportTicketId?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

// Static methods interface
export interface ILeadModel extends Model<ILead> {
    findBySalesRep(salesRepId: string, status?: LeadStatus): Promise<ILead[]>;
    getConversionRate(salesRepId: string): Promise<number>;
}

// Main Lead schema
const LeadSchema = new Schema<ILead, ILeadModel>(
    {
        company: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: [true, 'Company is required'],
            index: true,
        },
        salesRepresentative: {
            type: Schema.Types.ObjectId,
            ref: 'SalesRepresentative',
            required: [true, 'Sales representative is required'],
            index: true,
        },
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
        },
        phone: {
            type: String,
            required: [true, 'Phone is required'],
            trim: true,
        },
        companyName: {
            type: String,
            trim: true,
            maxlength: [150, 'Company name cannot exceed 150 characters'],
        },
        source: {
            type: String,
            enum: {
                values: ['website', 'referral', 'cold-call', 'event', 'social-media', 'other'],
                message: '{VALUE} is not a valid source',
            },
            default: 'other',
        },
        status: {
            type: String,
            enum: {
                values: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'],
                message: '{VALUE} is not a valid status',
            },
            default: 'new',
        },
        estimatedValue: {
            type: Number,
            min: 0,
        },
        actualValue: {
            type: Number,
            min: 0,
        },
        convertedToOrder: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
        },
        conversionDate: {
            type: Date,
        },
        notes: {
            type: String,
            maxlength: [2000, 'Notes cannot exceed 2000 characters'],
        },
        tags: [{ type: String, trim: true }],
        nextFollowUp: {
            type: Date,
        },
        lastContactedAt: {
            type: Date,
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
        territory: {
            type: String,
            trim: true,
        },
        score: {
            type: Number,
            default: 0,
        },
        relatedSupportTicketId: {
            type: Schema.Types.ObjectId,
            ref: 'SupportTicket',
        },
    },
    {
        timestamps: true,
    }
);

// ============================================================================
// INDEXES
// ============================================================================

// Company + status filtering
LeadSchema.index({ company: 1, status: 1 });

// Sales rep lookup
LeadSchema.index({ salesRepresentative: 1, status: 1 });

// Date-based queries
LeadSchema.index({ createdAt: -1 });

// Follow-up queries
LeadSchema.index({ nextFollowUp: 1 });

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Find leads by sales representative
 */
LeadSchema.statics.findBySalesRep = async function (
    salesRepId: string,
    status?: LeadStatus
): Promise<ILead[]> {
    const query: any = {
        salesRepresentative: new mongoose.Types.ObjectId(salesRepId),
    };
    if (status) query.status = status;

    return this.find(query).sort({ createdAt: -1 }).lean();
};

/**
 * Calculate conversion rate for a sales rep
 */
LeadSchema.statics.getConversionRate = async function (salesRepId: string): Promise<number> {
    const [result] = await this.aggregate([
        {
            $match: {
                salesRepresentative: new mongoose.Types.ObjectId(salesRepId),
                status: { $in: ['won', 'lost'] },
            },
        },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                won: {
                    $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] },
                },
            },
        },
    ]);

    if (!result || result.total === 0) return 0;
    return Math.round((result.won / result.total) * 100 * 100) / 100;
};

// Create and export the model
const Lead = mongoose.model<ILead, ILeadModel>('Lead', LeadSchema);

export default Lead;
