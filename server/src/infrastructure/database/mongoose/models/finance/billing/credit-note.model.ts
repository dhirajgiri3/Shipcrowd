import mongoose, { Document, Schema } from 'mongoose';

/**
 * Credit Note Model
 * 
 * Handles financial adjustments for RTOs, cancellations, or invoice corrections
 * GST Act Section 34 compliant
 * 
 * Use Cases:
 * - RTO (Return to Origin) shipments
 * - Service deficiency complaints
 * - Invoice errors or price adjustments
 * - Partial/full refunds
 */

export interface ICreditNote extends Document {
    // Identification
    creditNoteNumber: string; // CN-YYYYMM-XXXX (e.g., CN-202601-0001)
    creditNoteId: string; // Unique identifier
    creditNoteDate: Date;
    invoiceType: 'credit_note' | 'debit_note';

    // Company Reference
    companyId: mongoose.Types.ObjectId;

    // Original Invoice Reference
    originalInvoice: {
        invoiceId: mongoose.Types.ObjectId;
        invoiceNumber: string;
        invoiceDate: Date;
        invoiceAmount: number;
    };

    // Reason for Credit Note
    reason:
    | 'sales_return'
    | 'deficiency_in_service'
    | 'price_adjustment'
    | 'rto_shipment'
    | 'shipment_cancellation'
    | 'invoice_error'
    | 'other';
    reasonDescription: string;

    // Reference Document (AWB, RTO Event, etc.)
    referenceDocument?: {
        type: 'awb' | 'rto_event' | 'shipment' | 'other';
        id?: mongoose.Types.ObjectId;
        value: string; // AWB number, event ID, etc.
    };

    // Adjustment Details
    adjustment: {
        percentage: number; // 0-100 (100 = full credit)
        isPartial: boolean; // True if percentage < 100
    };

    // Line Items (from original invoice)
    lineItems: Array<{
        description: string;
        sacCode: string;
        quantity: number;
        unitPrice: number;

        // Original amounts
        originalTaxableAmount: number;
        originalCGST: number;
        originalSGST: number;
        originalIGST: number;
        originalTotalAmount: number;

        // Adjusted amounts (negative for reversal)
        adjustedTaxableAmount: number;
        adjustedCGST: number;
        adjustedSGST: number;
        adjustedIGST: number;
        adjustedTotalAmount: number;
    }>;

    // Financial Summary
    financialSummary: {
        // Original totals
        originalSubtotal: number;
        originalCGSTTotal: number;
        originalSGSTTotal: number;
        originalIGSTTotal: number;
        originalGrandTotal: number;

        // Adjusted totals (negative for reversal)
        adjustedSubtotal: number;
        adjustedCGSTTotal: number;
        adjustedSGSTTotal: number;
        adjustedIGSTTotal: number;
        adjustedGrandTotal: number; // Net credit amount (negative)
    };

    // GST Details (inherit from original invoice)
    gstDetails: {
        sellerGSTIN: string;
        buyerGSTIN: string;
        placeOfSupply: string; // State code
        placeOfSupplyState: string;
        isInterState: boolean;
        reverseCharge: boolean;
    };

    // Approval Workflow
    status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'cancelled';
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    approvalNotes?: string;

    rejectedBy?: mongoose.Types.ObjectId;
    rejectedAt?: Date;
    rejectionReason?: string;

    // PDF Generation
    pdfUrl?: string;
    pdfGeneratedAt?: Date;

    // Metadata
    createdBy: mongoose.Types.ObjectId;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const CreditNoteSchema = new Schema<ICreditNote>(
    {
        creditNoteNumber: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        creditNoteId: {
            type: String,
            required: true,
            unique: true,
        },
        creditNoteDate: {
            type: Date,
            required: true,
            default: Date.now,
        },
        invoiceType: {
            type: String,
            enum: ['credit_note', 'debit_note'],
            default: 'credit_note',
            required: true,
        },
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },
        originalInvoice: {
            invoiceId: {
                type: Schema.Types.ObjectId,
                ref: 'Invoice',
                required: true,
                index: true,
            },
            invoiceNumber: {
                type: String,
                required: true,
            },
            invoiceDate: {
                type: Date,
                required: true,
            },
            invoiceAmount: {
                type: Number,
                required: true,
            },
        },
        reason: {
            type: String,
            enum: [
                'sales_return',
                'deficiency_in_service',
                'price_adjustment',
                'rto_shipment',
                'shipment_cancellation',
                'invoice_error',
                'other',
            ],
            required: true,
        },
        reasonDescription: {
            type: String,
            required: true,
            maxlength: 500,
        },
        referenceDocument: {
            type: {
                type: String,
                enum: ['awb', 'rto_event', 'shipment', 'other'],
            },
            id: Schema.Types.ObjectId,
            value: String,
        },
        adjustment: {
            percentage: {
                type: Number,
                required: true,
                min: 0,
                max: 100,
            },
            isPartial: {
                type: Boolean,
                default: false,
            },
        },
        lineItems: [
            {
                description: { type: String, required: true },
                sacCode: String,
                quantity: { type: Number, required: true },
                unitPrice: { type: Number, required: true },

                originalTaxableAmount: { type: Number, required: true },
                originalCGST: { type: Number, required: true },
                originalSGST: { type: Number, required: true },
                originalIGST: { type: Number, required: true },
                originalTotalAmount: { type: Number, required: true },

                adjustedTaxableAmount: { type: Number, required: true },
                adjustedCGST: { type: Number, required: true },
                adjustedSGST: { type: Number, required: true },
                adjustedIGST: { type: Number, required: true },
                adjustedTotalAmount: { type: Number, required: true },
            },
        ],
        financialSummary: {
            originalSubtotal: { type: Number, required: true },
            originalCGSTTotal: { type: Number, required: true },
            originalSGSTTotal: { type: Number, required: true },
            originalIGSTTotal: { type: Number, required: true },
            originalGrandTotal: { type: Number, required: true },

            adjustedSubtotal: { type: Number, required: true },
            adjustedCGSTTotal: { type: Number, required: true },
            adjustedSGSTTotal: { type: Number, required: true },
            adjustedIGSTTotal: { type: Number, required: true },
            adjustedGrandTotal: { type: Number, required: true },
        },
        gstDetails: {
            sellerGSTIN: { type: String, required: true },
            buyerGSTIN: { type: String, required: true },
            placeOfSupply: { type: String, required: true },
            placeOfSupplyState: { type: String, required: true },
            isInterState: { type: Boolean, required: true },
            reverseCharge: { type: Boolean, default: false },
        },
        status: {
            type: String,
            enum: ['draft', 'pending_approval', 'approved', 'rejected', 'cancelled'],
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
        rejectedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        rejectedAt: Date,
        rejectionReason: String,
        pdfUrl: String,
        pdfGeneratedAt: Date,
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
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
CreditNoteSchema.index({ companyId: 1, status: 1, createdAt: -1 });
CreditNoteSchema.index({ 'originalInvoice.invoiceId': 1 });
CreditNoteSchema.index({ status: 1, createdAt: -1 });
CreditNoteSchema.index({ createdAt: -1 });

// Prevent duplicate credit notes for same invoice
CreditNoteSchema.index({ companyId: 1, 'originalInvoice.invoiceNumber': 1 }, { unique: true, sparse: true });

const CreditNote = mongoose.model<ICreditNote>('CreditNote', CreditNoteSchema);
export default CreditNote;
