/**
 * Report Configuration Model
 * 
 * Stores saved report configurations for custom analytics reports.
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IReportConfig extends Document {
    name: string;
    description?: string;
    reportType: 'order' | 'shipment' | 'revenue' | 'customer' | 'inventory' | 'custom';
    company: mongoose.Types.ObjectId;
    createdBy: mongoose.Types.ObjectId;
    isPublic: boolean;
    filters: {
        dateRange?: {
            start: Date;
            end: Date;
        };
        orderStatus?: string[];
        paymentMethod?: string[];
        courier?: string[];
        warehouse?: mongoose.Types.ObjectId[];
    };
    metrics: string[];
    groupBy?: 'day' | 'week' | 'month' | 'product' | 'customer' | 'courier' | 'none';
    sortBy?: {
        field: string;
        order: 'asc' | 'desc';
    };
    schedule?: {
        enabled: boolean;
        frequency: 'daily' | 'weekly' | 'monthly';
        recipients: string[];
        format: 'csv' | 'excel' | 'pdf';
    };
    createdAt: Date;
    updatedAt: Date;
}

const ReportConfigSchema = new Schema<IReportConfig>({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    reportType: {
        type: String,
        enum: ['order', 'shipment', 'revenue', 'customer', 'inventory', 'custom'],
        required: true
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    filters: {
        dateRange: {
            start: Date,
            end: Date
        },
        orderStatus: [String],
        paymentMethod: [String],
        courier: [String],
        warehouse: [Schema.Types.ObjectId]
    },
    metrics: {
        type: [String],
        default: []
    },
    groupBy: {
        type: String,
        enum: ['day', 'week', 'month', 'product', 'customer', 'courier', 'none']
    },
    sortBy: {
        field: String,
        order: {
            type: String,
            enum: ['asc', 'desc']
        }
    },
    schedule: {
        enabled: {
            type: Boolean,
            default: false
        },
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'monthly']
        },
        recipients: [String],
        format: {
            type: String,
            enum: ['csv', 'excel', 'pdf']
        }
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
ReportConfigSchema.index({ company: 1, createdBy: 1 });
ReportConfigSchema.index({ company: 1, 'schedule.enabled': 1 });

const ReportConfig = mongoose.model<IReportConfig>('ReportConfig', ReportConfigSchema);

export default ReportConfig;
