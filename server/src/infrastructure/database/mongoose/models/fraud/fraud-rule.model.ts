/**
 * Fraud Rule Model
 * 
 * Configurable fraud detection rules for pattern matching.
 * Supports various rule types and threshold configuration.
 */

import mongoose, { Schema, Document } from 'mongoose';

// ============================================================================
// INTERFACES
// ============================================================================

export interface IFraudRule extends Document {
    name: string;
    description?: string;
    type: 'velocity' | 'value' | 'address' | 'phone' | 'behavioral' | 'custom';

    // Rule Configuration
    condition: string;                      // e.g., "orders_per_hour > 5"
    weight: number;                         // Risk score contribution (0-50)
    threshold?: number;                     // Numeric threshold

    // Status
    active: boolean;
    priority: 'low' | 'medium' | 'high';

    // Metadata
    matchCount: number;                     // Times rule has matched
    lastMatched?: Date;

    // Audit
    createdBy: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;

    createdAt: Date;
    updatedAt: Date;

    // Methods
    recordMatch(): Promise<void>;
}

// ============================================================================
// SCHEMA
// ============================================================================

const FraudRuleSchema = new Schema<IFraudRule>(
    {
        name: {
            type: String,
            required: true,
            unique: true,
        },
        description: String,
        type: {
            type: String,
            enum: ['velocity', 'value', 'address', 'phone', 'behavioral', 'custom'],
            required: true,
            index: true,
        },

        // Rule Configuration
        condition: {
            type: String,
            required: true,
        },
        weight: {
            type: Number,
            required: true,
            min: 0,
            max: 50,
        },
        threshold: Number,

        // Status
        active: {
            type: Boolean,
            default: true,
            index: true,
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium',
        },

        // Metadata
        matchCount: {
            type: Number,
            default: 0,
        },
        lastMatched: Date,

        // Audit
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        updatedBy: {
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

FraudRuleSchema.index({ active: 1, type: 1 });
FraudRuleSchema.index({ priority: -1 });

// ============================================================================
// METHODS
// ============================================================================

/**
 * Increment match count
 */
FraudRuleSchema.methods.recordMatch = async function (): Promise<void> {
    this.matchCount += 1;
    this.lastMatched = new Date();
    await this.save();
};

// ============================================================================
// EXPORT
// ============================================================================

export default mongoose.model<IFraudRule>('FraudRule', FraudRuleSchema);
