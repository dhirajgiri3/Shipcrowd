import mongoose, { Document, Schema } from 'mongoose';
import { arrayLimit } from '../../../../../../shared/utils/arrayValidators';

/**
 * CODRemittance Model
 * 
 * Automates COD (Cash on Delivery) remittance with scheduled payouts,
 * on-demand requests, and real-time reconciliation.
 * 
 * Business Impact: 
 * - Eliminates manual processing (saves 5+ hours/week)
 * - Improves seller cash flow (automated vs. weekly manual)
 * - Zero discrepancies in calculations
 * 
 * Schedule Types:
 * - Daily (00:00 IST)
 * - Weekly (specific day of week)
 * - Bi-weekly (every 2 weeks)
 * - Monthly (specific day of month)
 * - On-demand (with 4-hour processing SLA)
 * 
 * Lifecycle:
 * 1. Scheduler job creates batch (status: pending_approval)
 * 2. Admin/Auto approves (status: approved)
 * 3. Processor job initiates Razorpay payout (status: processing)
 * 4. Razorpay webhook confirms (status: completed)
 */

export interface ICODRemittance extends Document {
    // Identification
    remittanceId: string; // REM-YYYYMMDD-XXXXX (e.g., REM-20260107-AB12)
    companyId: mongoose.Types.ObjectId;
    scheduleId?: string; // Links to company's schedule config

    // Batch Details
    batch: {
        batchNumber: number; // Sequential number per company
        createdDate: Date;
        cutoffDate: Date; // Latest delivery date included
        shippingPeriod: {
            start: Date;
            end: Date;
        };
    };

    // Schedule Information
    schedule: {
        type: 'scheduled' | 'on_demand' | 'manual';
        scheduledDate?: Date;
        requestedBy?: mongoose.Types.ObjectId; // For on-demand requests
    };

    // Eligible Shipments
    shipments: Array<{
        shipmentId: mongoose.Types.ObjectId;
        awb: string;
        codAmount: number;
        deliveredAt: Date;
        status: 'delivered' | 'rto' | 'disputed';

        // Deductions breakdown
        deductions: {
            shippingCharge: number;
            weightDispute?: number;
            rtoCharge?: number;
            insuranceCharge?: number;
            platformFee?: number; // 0.5% of COD
            otherFees?: number;
            total: number;
        };

        netAmount: number; // codAmount - deductions.total

        // Reconciliation Data
        reconciliation?: {
            status: 'pending' | 'matched' | 'mismatch' | 'not_found_in_file' | 'manual_override';
            courierAmount?: number;
            diffAmount?: number;
            remarks?: string;
        };
    }>;

    // Financial Summary
    financial: {
        totalCODCollected: number;
        totalShipments: number;
        successfulDeliveries: number;
        rtoCount: number;
        disputedCount: number;

        deductionsSummary: {
            totalShippingCharges: number;
            totalWeightDisputes: number;
            totalRTOCharges: number;
            totalInsuranceCharges: number;
            totalPlatformFees: number;
            totalOtherFees: number;
            grandTotal: number;
        };

        netPayable: number; // totalCODCollected - deductionsSummary.grandTotal
    };

    // Payout Details
    payout: {
        status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
        method: 'razorpay_payout' | 'bank_transfer' | 'wallet_credit' | 'manual';

        // Razorpay Integration
        razorpayPayoutId?: string;
        razorpayFundAccountId?: string;
        razorpayContactId?: string;

        // Bank Details
        accountDetails?: {
            accountNumber: string;
            ifscCode: string;
            accountHolderName: string;
            bankName?: string;
            upiId?: string;
        };

        // Processing Timestamps
        initiatedAt?: Date;
        processedAt?: Date;
        completedAt?: Date;

        // Failure Handling
        failureReason?: string;
        retryCount?: number;
        lastRetryAt?: Date;
        // Phase 1 Hardening: Error tracking
        lastError?: string;
        requiresManualIntervention?: boolean;
    };

    // Approval Workflow
    status: 'draft' | 'pending_approval' | 'approved' | 'paid' | 'cancelled' | 'failed';
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    approvalNotes?: string;

    // Cancellation
    cancelledBy?: mongoose.Types.ObjectId;
    cancelledAt?: Date;
    cancellationReason?: string;

    // Reports
    reportGenerated: boolean;
    reportUrl?: string; // S3/CloudFlare URL for PDF report
    reportGeneratedAt?: Date;

    // Timeline (audit trail)
    timeline: Array<{
        status: string;
        timestamp: Date;
        actor: mongoose.Types.ObjectId | 'system';
        action: string;
        notes?: string;
    }>;

    // Metadata
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// Create the CODRemittance schema
const CODRemittanceSchema = new Schema<ICODRemittance>(
    {
        remittanceId: {
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
        scheduleId: {
            type: String,
        },
        batch: {
            batchNumber: {
                type: Number,
                required: true,
            },
            createdDate: {
                type: Date,
                required: true,
                default: Date.now,
            },
            cutoffDate: {
                type: Date,
                required: true,
            },
            shippingPeriod: {
                start: {
                    type: Date,
                    required: true,
                },
                end: {
                    type: Date,
                    required: true,
                },
            },
        },
        schedule: {
            type: {
                type: String,
                enum: ['scheduled', 'on_demand', 'manual'],
                required: true,
            },
            scheduledDate: Date,
            requestedBy: {
                type: Schema.Types.ObjectId,
                ref: 'User',
            },
        },
        shipments: {
            type: [
                {
                    shipmentId: {
                        type: Schema.Types.ObjectId,
                        ref: 'Shipment',
                        required: true,
                    },
                    awb: {
                        type: String,
                        required: true,
                    },
                    codAmount: {
                        type: Number,
                        required: true,
                    },
                    deliveredAt: {
                        type: Date,
                        required: true,
                    },
                    status: {
                        type: String,
                        enum: ['delivered', 'rto', 'disputed'],
                        required: true,
                    },
                    deductions: {
                        shippingCharge: {
                            type: Number,
                            default: 0,
                        },
                        weightDispute: Number,
                        rtoCharge: Number,
                        insuranceCharge: Number,
                        platformFee: Number,
                        otherFees: Number,
                        total: {
                            type: Number,
                            required: true,
                        },
                    },
                    netAmount: {
                        type: Number,
                        required: true,
                    },
                    // ✅ NEW: Reconciliation Data (Phase 1)
                    reconciliation: {
                        status: {
                            type: String,
                            enum: ['pending', 'matched', 'mismatch', 'not_found_in_file', 'manual_override'],
                            default: 'pending'
                        },
                        courierAmount: Number, // Amount reported by Velocity
                        diffAmount: Number,    // dbAmount - courierAmount
                        remarks: String
                    }
                },
            ],
            validate: [
                arrayLimit(10000),
                'Maximum 10,000 shipments per remittance batch',
            ],
        },
        financial: {
            totalCODCollected: {
                type: Number,
                required: true,
            },
            totalShipments: {
                type: Number,
                required: true,
            },
            successfulDeliveries: {
                type: Number,
                required: true,
            },
            rtoCount: {
                type: Number,
                default: 0,
            },
            disputedCount: {
                type: Number,
                default: 0,
            },
            deductionsSummary: {
                totalShippingCharges: {
                    type: Number,
                    default: 0,
                },
                totalWeightDisputes: {
                    type: Number,
                    default: 0,
                },
                totalRTOCharges: {
                    type: Number,
                    default: 0,
                },
                totalInsuranceCharges: {
                    type: Number,
                    default: 0,
                },
                totalPlatformFees: {
                    type: Number,
                    default: 0,
                },
                totalOtherFees: {
                    type: Number,
                    default: 0,
                },
                grandTotal: {
                    type: Number,
                    required: true,
                },
            },
            netPayable: {
                type: Number,
                required: true,
            },
        },
        payout: {
            status: {
                type: String,
                enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
                default: 'pending',
                required: true,
            },
            method: {
                type: String,
                enum: ['razorpay_payout', 'bank_transfer', 'wallet_credit', 'manual'],
                default: 'razorpay_payout',
            },
            razorpayPayoutId: String,
            razorpayFundAccountId: String,
            razorpayContactId: String,
            accountDetails: {
                accountNumber: String,
                ifscCode: String,
                accountHolderName: String,
                bankName: String,
                upiId: String,
            },
            initiatedAt: Date,
            processedAt: Date,
            completedAt: Date,
            failureReason: String,
            retryCount: {
                type: Number,
                default: 0,
            },
            lastRetryAt: Date,
            lastError: String,
            requiresManualIntervention: {
                type: Boolean,
                default: false,
            },
        },
        status: {
            type: String,
            enum: ['draft', 'pending_approval', 'approved', 'paid', 'cancelled', 'failed'],
            default: 'draft',
            required: true,
            index: true,
        },
        approvedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        approvedAt: Date,
        approvalNotes: String,
        cancelledBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        cancelledAt: Date,
        cancellationReason: String,
        reportGenerated: {
            type: Boolean,
            default: false,
        },
        reportUrl: String,
        reportGeneratedAt: Date,
        timeline: {
            type: [
                {
                    status: {
                        type: String,
                        required: true,
                    },
                    timestamp: {
                        type: Date,
                        default: Date.now,
                    },
                    actor: {
                        type: Schema.Types.Mixed, // Can be ObjectId or 'system'
                    },
                    action: {
                        type: String,
                        required: true,
                    },
                    notes: String,
                },
            ],
            validate: [
                arrayLimit(100),
                'Maximum 100 timeline entries per remittance',
            ],
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for performance
CODRemittanceSchema.index({ companyId: 1, status: 1, createdAt: -1 }); // Company's remittances
CODRemittanceSchema.index({ status: 1, createdAt: -1 }); // Admin: Pending approvals
CODRemittanceSchema.index({ 'schedule.scheduledDate': 1 }); // Scheduler job
CODRemittanceSchema.index({ 'payout.status': 1 }); // Processor job
// Phase 1 Hardening: Unique Payout ID
CODRemittanceSchema.index(
    { 'payout.razorpayPayoutId': 1 },
    {
        unique: true,
        sparse: true,
        background: true,
        name: 'idx_payout_razorpay_id'
    }
);
CODRemittanceSchema.index({ companyId: 1, 'batch.batchNumber': -1 }); // Latest batch number
CODRemittanceSchema.index({ createdAt: -1 }); // Recent remittances

// Compound index for processor job
CODRemittanceSchema.index({
    status: 1,
    'payout.status': 1,
    'schedule.scheduledDate': 1
});

// Pre-save hook to ensure initial timeline entry
CODRemittanceSchema.pre('save', function (next) {
    const remittance = this;

    // If this is a new remittance, add initial timeline entry
    if (remittance.isNew && remittance.timeline.length === 0) {
        remittance.timeline.push({
            status: remittance.status,
            timestamp: new Date(),
            actor: 'system',
            action: `Remittance batch created: ${remittance.shipments.length} shipments, ₹${remittance.financial.netPayable.toLocaleString()} net payable`,
        });
    }

    next();
});

// Create and export the model
const CODRemittance = mongoose.model<ICODRemittance>('CODRemittance', CODRemittanceSchema);
export default CODRemittance;
