/**
 * SKU Weight Profile Model
 * 
 * Tracks historical weight data for product SKUs to:
 * 1. Learn typical weight patterns using statistical analysis (Welford's algorithm)
 * 2. Auto-suggest weights during order creation
 * 3. Prevent disputes by fixing root cause (incorrect declared weights)
 * 4. Detect weight manipulation patterns
 * 
 * Industry standard naming: "Weight Profile" (not "Master")
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface ISKUWeightProfile extends Document {
    companyId: mongoose.Types.ObjectId;
    sku: string;
    productName?: string;
    
    // Statistical weight data (Welford's algorithm)
    statistics: {
        sampleCount: number;           // N: Number of verified shipments
        mean: number;                  // μ: Average weight in kg
        m2: number;                    // M2: Sum of squared differences (for variance)
        standardDeviation: number;     // σ: Standard deviation
        min: number;                   // Minimum observed weight
        max: number;                   // Maximum observed weight
        lastUpdated: Date;
    };
    
    // Suggested weight for order creation
    suggestedWeight: {
        value: number;                 // Suggested weight in kg
        unit: 'kg';
        confidenceScore: number;       // 0-100 (based on sample count & std dev)
        lastCalculated: Date;
    };
    
    // Weight freeze (for consistent SKUs)
    frozen: {
        isFrozen: boolean;
        frozenWeight?: number;          // ✅ FIX: Optional fixed weight in kg
        frozenBy?: mongoose.Types.ObjectId;
        frozenAt?: Date;
        reason?: string;
    };
    
    // Dispute history for this SKU
    disputeHistory: {
        totalDisputes: number;
        resolvedInSellerFavor: number;
        resolvedInCarrierFavor: number;
        lastDisputeDate?: Date;
    };
    
    // Metadata
    firstShipmentDate: Date;
    lastShipmentDate: Date;
    isActive: boolean;
    isDeleted: boolean;
}

const SKUWeightProfileSchema = new Schema<ISKUWeightProfile>(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },
        sku: {
            type: String,
            required: true,
            index: true,
        },
        productName: String,
        
        statistics: {
            sampleCount: {
                type: Number,
                default: 0,
            },
            mean: {
                type: Number,
                default: 0,
            },
            m2: {
                type: Number,
                default: 0,
            },
            standardDeviation: {
                type: Number,
                default: 0,
            },
            min: {
                type: Number,
                default: 0,
            },
            max: {
                type: Number,
                default: 0,
            },
            lastUpdated: {
                type: Date,
                default: Date.now,
            },
        },
        
        suggestedWeight: {
            value: {
                type: Number,
                default: 0,
            },
            unit: {
                type: String,
                enum: ['kg'],
                default: 'kg',
            },
            confidenceScore: {
                type: Number,
                min: 0,
                max: 100,
                default: 0,
            },
            lastCalculated: {
                type: Date,
                default: Date.now,
            },
        },
        
        frozen: {
            isFrozen: {
                type: Boolean,
                default: false,
            },
            frozenWeight: {
                type: Number,
                required: false,
            },
            frozenBy: {
                type: Schema.Types.ObjectId,
                ref: 'User',
                required: false,
            },
            frozenAt: {
                type: Date,
                required: false,
            },
            reason: {
                type: String,
                required: false,
            },
        },
        
        disputeHistory: {
            totalDisputes: {
                type: Number,
                default: 0,
            },
            resolvedInSellerFavor: {
                type: Number,
                default: 0,
            },
            resolvedInCarrierFavor: {
                type: Number,
                default: 0,
            },
            lastDisputeDate: Date,
        },
        
        firstShipmentDate: {
            type: Date,
            default: Date.now,
        },
        lastShipmentDate: {
            type: Date,
            default: Date.now,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for efficient queries
SKUWeightProfileSchema.index({ companyId: 1, sku: 1 }, { unique: true });
SKUWeightProfileSchema.index({ companyId: 1, isActive: 1, isDeleted: 1 });
SKUWeightProfileSchema.index({ 'statistics.sampleCount': 1 }); // For filtering by confidence

export const SKUWeightProfile = mongoose.model<ISKUWeightProfile>('SKUWeightProfile', SKUWeightProfileSchema);
