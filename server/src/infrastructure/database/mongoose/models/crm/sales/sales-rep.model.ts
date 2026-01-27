import mongoose, { Document, Schema } from 'mongoose';

export interface ISalesRep extends Document {
    companyId: mongoose.Types.ObjectId;
    userId?: mongoose.Types.ObjectId; // Optional link to a User account if they have login access
    name: string;
    email: string;
    phone: string;
    territory: string;
    status: 'active' | 'inactive';
    availabilityStatus: 'available' | 'busy' | 'offline';
    reportingTo?: mongoose.Types.ObjectId;
    bankDetails: {
        accountNumber: string; // Encrypted
        ifscCode: string; // Encrypted
        accountHolderName: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

const SalesRepSchema = new Schema<ISalesRep>(
    {
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
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        phone: {
            type: String,
            required: true,
            trim: true,
        },
        territory: {
            type: String,
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
            index: true,
        },
        availabilityStatus: {
            type: String,
            enum: ['available', 'busy', 'offline'],
            default: 'offline',
            index: true,
        },
        reportingTo: {
            type: Schema.Types.ObjectId,
            ref: 'SalesRepresentative', // Self-reference for hierarchy
            index: true,
        },
        bankDetails: {
            accountNumber: { type: String, select: false }, // Encrypted, hidden by default
            ifscCode: { type: String, select: false }, // Encrypted, hidden by default
            accountHolderName: { type: String },
        },
    },
    {
        timestamps: true,
    }
);

// Index for getting reps by territory and status efficiently
SalesRepSchema.index({ companyId: 1, territory: 1, status: 1 });

const SalesRepresentative = mongoose.models.SalesRepresentative || mongoose.model<ISalesRep>('SalesRepresentative', SalesRepSchema);
export default SalesRepresentative;
