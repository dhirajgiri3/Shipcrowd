import mongoose, { Document, Schema } from 'mongoose';

/**
 * Label Template Model
 * Custom label designs for shipping labels
 */

export interface ILabelTemplate extends Document {
    name: string;
    description?: string;
    companyId: mongoose.Types.ObjectId;

    // Template Configuration
    type: 'shipping' | 'return' | 'combined'; // Shipping, return label, or both
    format: 'pdf' | 'thermal' | 'zpl'; // Output format
    pageSize: 'A4' | 'A5' | 'A6' | '4x6' | '4x8' | 'custom';
    customDimensions?: {
        width: number; // in mm
        height: number; // in mm
    };

    // Layout Configuration
    layout: {
        orientation: 'portrait' | 'landscape';
        margins: {
            top: number;
            right: number;
            bottom: number;
            left: number;
        };
        sections: Array<{
            id: string;
            type: 'text' | 'barcode' | 'qrcode' | 'image' | 'logo' | 'table';
            position: {
                x: number;
                y: number;
                width: number;
                height: number;
            };
            content: string; // Template variable like {{awb}}, {{customer_name}}
            style: {
                fontSize?: number;
                fontWeight?: 'normal' | 'bold';
                fontFamily?: string;
                textAlign?: 'left' | 'center' | 'right';
                color?: string;
                backgroundColor?: string;
                border?: boolean;
                borderColor?: string;
                borderWidth?: number;
            };
            // For barcode/QR
            barcodeType?: 'CODE128' | 'CODE39' | 'EAN13' | 'QR';
            // For image
            imageUrl?: string;
        }>;
    };

    // Branding
    branding?: {
        logo?: string; // URL or base64
        companyName?: string;
        brandColor?: string;
        showCompanyInfo?: boolean;
    };

    // Print Settings
    printSettings: {
        dpi: number; // 203, 300, 600
        thermalPrinter?: {
            printerModel?: string;
            darkness?: number; // 0-30
            speed?: number; // 1-14
        };
        multiPage?: {
            enabled: boolean;
            pages: Array<{
                type: 'shipping' | 'return' | 'instructions';
                template: string; // Reference to another template or inline config
            }>;
        };
    };

    // Template Variables
    supportedVariables: string[]; // List of {{variable}} placeholders

    // Status
    isActive: boolean;
    isDefault: boolean; // Default template for this company

    // Metadata
    createdBy: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    lastUsedAt?: Date;
    usageCount: number;

    createdAt: Date;
    updatedAt: Date;
}

const LabelTemplateSchema = new Schema<ILabelTemplate>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: String,
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ['shipping', 'return', 'combined'],
            required: true,
        },
        format: {
            type: String,
            enum: ['pdf', 'thermal', 'zpl'],
            required: true,
        },
        pageSize: {
            type: String,
            enum: ['A4', 'A5', 'A6', '4x6', '4x8', 'custom'],
            required: true,
        },
        customDimensions: {
            width: Number,
            height: Number,
        },
        layout: {
            orientation: {
                type: String,
                enum: ['portrait', 'landscape'],
                required: true,
            },
            margins: {
                top: { type: Number, required: true },
                right: { type: Number, required: true },
                bottom: { type: Number, required: true },
                left: { type: Number, required: true },
            },
            sections: [
                {
                    id: String,
                    type: {
                        type: String,
                        enum: ['text', 'barcode', 'qrcode', 'image', 'logo', 'table'],
                    },
                    position: {
                        x: Number,
                        y: Number,
                        width: Number,
                        height: Number,
                    },
                    content: String,
                    style: {
                        fontSize: Number,
                        fontWeight: String,
                        fontFamily: String,
                        textAlign: String,
                        color: String,
                        backgroundColor: String,
                        border: Boolean,
                        borderColor: String,
                        borderWidth: Number,
                    },
                    barcodeType: String,
                    imageUrl: String,
                },
            ],
        },
        branding: {
            logo: String,
            companyName: String,
            brandColor: String,
            showCompanyInfo: Boolean,
        },
        printSettings: {
            dpi: {
                type: Number,
                required: true,
                default: 300,
            },
            thermalPrinter: {
                printerModel: String,
                darkness: Number,
                speed: Number,
            },
            multiPage: {
                enabled: Boolean,
                pages: [
                    {
                        type: String,
                        template: String,
                    },
                ],
            },
        },
        supportedVariables: [String],
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        isDefault: {
            type: Boolean,
            default: false,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        lastUsedAt: Date,
        usageCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
LabelTemplateSchema.index({ companyId: 1, isActive: 1 });
LabelTemplateSchema.index({ companyId: 1, isDefault: 1 });
LabelTemplateSchema.index({ companyId: 1, type: 1 });

// Ensure only one default template per company per type
LabelTemplateSchema.pre('save', async function (next) {
    if (this.isDefault && this.isModified('isDefault')) {
        await mongoose.model('LabelTemplate').updateMany(
            {
                companyId: this.companyId,
                type: this.type,
                _id: { $ne: this._id },
            },
            {
                $set: { isDefault: false },
            }
        );
    }
    next();
});

const LabelTemplate = mongoose.model<ILabelTemplate>('LabelTemplate', LabelTemplateSchema);

export default LabelTemplate;
