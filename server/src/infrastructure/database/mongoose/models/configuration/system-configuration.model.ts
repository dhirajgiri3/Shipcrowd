import mongoose, { Schema, Document } from 'mongoose';

/**
 * SystemConfiguration Model
 * 
 * Stores global system configuration settings as key-value pairs.
 * Used for dynamic settings that shouldn't be hardcoded (e.g., Metro Cities list).
 */

export interface ISystemConfiguration extends Document {
    key: string;
    value: any; // Flexible value structure
    description: string;
    isActive: boolean;
    meta?: {
        source: string; // e.g., 'internal', 'admin', 'system_init'
        version?: string;
        lastUpdatedBy?: string;
        updatedAt: Date;
    };
    createdAt: Date;
    updatedAt: Date;
}

const SystemConfigurationSchema = new Schema<ISystemConfiguration>(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true
        },
        value: {
            type: Schema.Types.Mixed,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        isActive: {
            type: Boolean,
            default: true
        },
        meta: {
            source: { type: String, required: true },
            version: { type: String },
            lastUpdatedBy: { type: String },
            updatedAt: { type: Date, default: Date.now }
        }
    },
    {
        timestamps: true,
        minimize: false // Allow empty objects in Mixed types if needed
    }
);

// Indexes
SystemConfigurationSchema.index({ key: 1 });
SystemConfigurationSchema.index({ isActive: 1 });

const SystemConfiguration = mongoose.model<ISystemConfiguration>('SystemConfiguration', SystemConfigurationSchema);
export default SystemConfiguration;
