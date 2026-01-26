import mongoose, { Document, Schema } from 'mongoose';

export interface ISupportTicket extends Document {
    ticketId: string;
    companyId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    subject: string;
    category: 'technical' | 'billing' | 'logistics' | 'other';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    description: string;
    attachments: string[];
    history: Array<{
        action: string;
        actor: mongoose.Types.ObjectId;
        message?: string;
        timestamp: Date;
    }>;
    lastReplyAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const SupportTicketSchema = new Schema<ISupportTicket>(
    {
        ticketId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        subject: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            enum: ['technical', 'billing', 'logistics', 'other'],
            required: true,
            index: true,
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'urgent'],
            default: 'medium',
        },
        status: {
            type: String,
            enum: ['open', 'in_progress', 'resolved', 'closed'],
            default: 'open',
            index: true,
        },
        description: {
            type: String,
            required: true,
        },
        attachments: [{
            type: String,
        }],
        history: [{
            action: String,
            actor: { type: Schema.Types.ObjectId, ref: 'User' },
            message: String,
            timestamp: { type: Date, default: Date.now },
        }],
        lastReplyAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Auto-generate ticket ID (e.g., TKT-123456)
SupportTicketSchema.pre('validate', async function (next) {
    if (!this.ticketId) {
        const random = Math.floor(100000 + Math.random() * 900000); // 6 digit random
        this.ticketId = `TKT-${random}`;
    }
    next();
});

const SupportTicket = mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);
export default SupportTicket;
