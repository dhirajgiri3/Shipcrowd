import mongoose, { Document, Schema } from 'mongoose';
import TicketCounter from './ticket-counter.model';

export interface ISupportTicket extends Document {
    ticketId: string;
    companyId: mongoose.Types.ObjectId;
    userId?: mongoose.Types.ObjectId; // User who raised the ticket (optional, could be system generated)
    subject: string;
    category: 'technical' | 'billing' | 'logistics' | 'other';
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    description: string;
    attachments: string[];
    relatedOrderId?: string;
    relatedNDREventId?: mongoose.Types.ObjectId;
    assignedTo?: mongoose.Types.ObjectId; // SalesRep
    slaBreached: boolean;
    resolvedAt?: Date;
    history: Array<{
        action: string;
        actor?: mongoose.Types.ObjectId;
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
            enum: ['low', 'medium', 'high', 'critical'],
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
        relatedOrderId: {
            type: String,
            index: true,
        },
        relatedNDREventId: {
            type: Schema.Types.ObjectId,
            ref: 'NDREvent',
            index: true,
        },
        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: 'User', // Taking User for now, SalesRep later when Phase 2 is implemented or if SalesRep is an extension of User
            index: true,
        },
        slaBreached: {
            type: Boolean,
            default: false,
        },
        resolvedAt: {
            type: Date,
        },
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

// Auto-generate ticket ID (TKT-100001) using TicketCounter
SupportTicketSchema.pre('save', async function (next) {
    if (this.isNew && !this.ticketId) {
        try {
            const counter = await TicketCounter.findByIdAndUpdate(
                'support_ticket',
                { $inc: { counter: 1 } },
                { new: true, upsert: true }
            );

            if (counter) {
                this.ticketId = `TKT-${counter.counter}`;
            } else {
                // Fallback (should rarely happen if upset works)
                const random = Math.floor(100000 + Math.random() * 900000);
                this.ticketId = `TKT-${random}`;
            }
        } catch (error: any) {
            return next(error);
        }
    }
    next();
});

const SupportTicket = mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);
export default SupportTicket;
