import mongoose, { Document, Schema } from 'mongoose';

export interface IBlacklistItem extends Document {
    type: 'phone' | 'email' | 'pincode' | 'ip';
    value: string;
    reason: string;
    isActive: boolean;
    addedBy?: mongoose.Types.ObjectId;
    companyId?: mongoose.Types.ObjectId; // Can be merchant-specific or global
    createdAt: Date;
    updatedAt: Date;
}

const BlacklistItemSchema = new Schema<IBlacklistItem>(
    {
        type: { type: String, enum: ['phone', 'email', 'pincode', 'ip'], required: true },
        value: { type: String, required: true },
        reason: String,
        isActive: { type: Boolean, default: true },
        addedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        companyId: { type: Schema.Types.ObjectId, ref: 'Company' }
    },
    { timestamps: true }
);

BlacklistItemSchema.index({ type: 1, value: 1, companyId: 1 });
BlacklistItemSchema.index({ value: 1 }); // Global lookup optimization

export default mongoose.model<IBlacklistItem>('BlacklistItem', BlacklistItemSchema);
