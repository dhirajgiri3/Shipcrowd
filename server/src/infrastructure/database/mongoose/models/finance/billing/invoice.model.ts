import mongoose, { Document, Schema } from 'mongoose';

/**
 * Invoice Model
 * GST-compliant invoice generation for freight/courier services
 * SAC Code: 996812 (Courier services)
 */

export interface ILineItem {
    description: string;
    sacCode: string; // Service Accounting Code
    quantity: number;
    unitPrice: number;
    taxableAmount: number;
    cgst: number; // Central GST (9% for intra-state)
    sgst: number; // State GST (9% for intra-state)
    igst: number; // Integrated GST (18% for inter-state)
    totalAmount: number;
    shipmentReference?: {
        shipmentId: mongoose.Types.ObjectId;
        awb: string;
    };
}

export interface IInvoice extends Document {
    invoiceId: string;
    invoiceNumber: string; // Sequential: INV-202601-0001
    invoiceType: 'invoice' | 'credit_note';
    companyId: mongoose.Types.ObjectId;

    billingPeriod: {
        startDate: Date;
        endDate: Date;
    };

    lineItems: ILineItem[];

    financialSummary: {
        subtotal: number;
        cgstTotal: number;
        sgstTotal: number;
        igstTotal: number;
        grandTotal: number;
    };

    gstDetails: {
        sellerGSTIN: string; // Helix's GSTIN
        buyerGSTIN: string; // Company's GSTIN
        placeOfSupply: string; // State code (e.g., "06")
        placeOfSupplyState: string; // State name (e.g., "Haryana")
        isInterState: boolean;
        reverseCharge: boolean;
    };

    status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

    // IRN (Invoice Reference Number) - GSTN e-Invoice Compliance
    irn?: string; // Unique IRN from IRP (Invoice Registration Portal)
    irnGeneratedAt?: Date; // Timestamp when IRN was generated
    irnStatus?: 'pending' | 'generated' | 'cancelled' | 'failed'; // IRN lifecycle status
    qrCodeData?: string; // Base64 encoded QR code image from GSTN
    signedInvoiceJson?: string; // Digitally signed invoice JSON from IRP

    pdfUrl?: string;
    csvUrl?: string;

    sentAt?: Date;
    sentTo?: string[];
    paidAt?: Date;
    dueDate?: Date;

    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;

    // Soft delete fields
    isDeleted: boolean;
    deletedAt?: Date;
    deletedBy?: mongoose.Types.ObjectId;
    schemaVersion: number;
}

const LineItemSchema = new Schema<ILineItem>(
    {
        description: {
            type: String,
            required: true,
        },
        sacCode: {
            type: String,
            required: true,
            default: '996812', // Courier services
        },
        quantity: {
            type: Number,
            required: true,
            min: 0,
        },
        unitPrice: {
            type: Number,
            required: true,
            min: 0,
        },
        taxableAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        cgst: {
            type: Number,
            required: true,
            default: 0,
        },
        sgst: {
            type: Number,
            required: true,
            default: 0,
        },
        igst: {
            type: Number,
            required: true,
            default: 0,
        },
        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        shipmentReference: {
            shipmentId: {
                type: Schema.Types.ObjectId,
                ref: 'Shipment',
            },
            awb: String,
        },
    },
    { _id: false }
);

const InvoiceSchema = new Schema<IInvoice>(
    {
        invoiceId: {
            type: String,
            required: true,
            unique: true,
        },
        invoiceNumber: {
            type: String,
            required: true,
            unique: true,
        },
        invoiceType: {
            type: String,
            enum: ['invoice', 'credit_note'],
            default: 'invoice',
        },
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },
        billingPeriod: {
            startDate: {
                type: Date,
                required: true,
            },
            endDate: {
                type: Date,
                required: true,
            },
        },
        lineItems: {
            type: [LineItemSchema],
            required: true,
            validate: {
                validator: (items: ILineItem[]) => items.length > 0,
                message: 'Invoice must have at least one line item',
            },
        },
        financialSummary: {
            subtotal: {
                type: Number,
                required: true,
                min: 0,
            },
            cgstTotal: {
                type: Number,
                required: true,
                default: 0,
            },
            sgstTotal: {
                type: Number,
                required: true,
                default: 0,
            },
            igstTotal: {
                type: Number,
                required: true,
                default: 0,
            },
            grandTotal: {
                type: Number,
                required: true,
                min: 0,
            },
        },
        gstDetails: {
            sellerGSTIN: {
                type: String,
                required: true,
            },
            buyerGSTIN: {
                type: String,
                required: true,
            },
            placeOfSupply: {
                type: String,
                required: true,
            },
            placeOfSupplyState: {
                type: String,
                required: true,
            },
            isInterState: {
                type: Boolean,
                required: true,
            },
            reverseCharge: {
                type: Boolean,
                default: false,
            },
        },
        status: {
            type: String,
            enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
            default: 'draft',
        },
        // IRN (Invoice Reference Number) - GSTN e-Invoice Compliance
        irn: {
            type: String,
            index: true,
            sparse: true, // Only index documents that have this field
        },
        irnGeneratedAt: Date,
        irnStatus: {
            type: String,
            enum: ['pending', 'generated', 'cancelled', 'failed'],
            default: 'pending',
        },
        qrCodeData: String, // Base64 encoded QR code from GSTN
        signedInvoiceJson: String, // Digitally signed JSON from IRP
        pdfUrl: String,
        csvUrl: String,
        sentAt: Date,
        sentTo: [String],
        paidAt: Date,
        dueDate: Date,
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        // Soft delete fields
        isDeleted: {
            type: Boolean,
            default: false,
            index: true
        },
        deletedAt: Date,
        deletedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        schemaVersion: {
            type: Number,
            default: 1,
            index: true
        }
    },
    {
        timestamps: true,
    }
);

// Indexes
InvoiceSchema.index({ companyId: 1, createdAt: -1 });
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ 'billingPeriod.startDate': 1, 'billingPeriod.endDate': 1 });

// Pre-find hook to exclude deleted documents by default
InvoiceSchema.pre(/^find/, function (this: mongoose.Query<any, any>, next) {
    if ((this as any)._conditions.isDeleted === undefined) {
        this.where({ isDeleted: false });
    }
    next();
});

const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);
export default Invoice;
