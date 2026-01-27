import mongoose, { Document, Schema } from 'mongoose';

/**
 * Ticket Counter Model
 * Transaction-safe sequential numbering for support tickets
 *
 * Format: TKT-XXXXXX (e.g., TKT-100001)
 */

export interface ITicketCounter extends Document {
    counter: number;
}

const TicketCounterSchema = new Schema<ITicketCounter>(
    {
        _id: { type: String, required: true }, // ID will be 'support_ticket'
        counter: {
            type: Number,
            default: 100000,
        },
    },
    {
        timestamps: true,
    }
);

const TicketCounter = mongoose.model<ITicketCounter>(
    'TicketCounter',
    TicketCounterSchema
);

export default TicketCounter;
