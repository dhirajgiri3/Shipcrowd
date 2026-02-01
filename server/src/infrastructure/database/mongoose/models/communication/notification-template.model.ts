import mongoose, { Document, Schema } from 'mongoose';

/**
 * Notification Template Model
 *
 * Purpose: Store reusable notification templates for WhatsApp, Email, SMS
 *
 * Features:
 * - Multi-channel support (WhatsApp, Email, SMS)
 * - Variable placeholders ({{customerName}}, {{awb}}, etc.)
 * - Category-based templates (NDR, RTO, Delivery, etc.)
 * - Company-specific or global templates
 * - Active/inactive status
 * - Usage tracking
 */

export interface INotificationTemplate extends Document {
    companyId?: mongoose.Types.ObjectId; // null = global template (admin only)
    name: string; // Display name
    code: string; // Unique code for programmatic access (e.g., 'ndr_initial_contact')
    category: 'ndr' | 'rto' | 'delivery' | 'pickup' | 'cod' | 'general' | 'marketing';
    channel: 'whatsapp' | 'email' | 'sms';

    // Content
    subject?: string; // For email only
    body: string; // Template body with {{variables}}

    // Variables
    variables: string[]; // List of available variables (e.g., ['customerName', 'awb', 'orderId'])

    // Status
    isActive: boolean;
    isDefault: boolean; // Is this the default template for this category/channel?

    // Usage tracking
    usageCount: number;
    lastUsedAt?: Date;

    // Metadata
    createdAt: Date;
    updatedAt: Date;

    // Methods
    incrementUsage(): Promise<void>;
    renderTemplate(variables: Record<string, any>): { subject?: string; body: string };
}

const NotificationTemplateSchema = new Schema<INotificationTemplate>(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            default: null, // null = global template
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        code: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
        },
        category: {
            type: String,
            required: true,
            enum: ['ndr', 'rto', 'delivery', 'pickup', 'cod', 'general', 'marketing'],
            index: true,
        },
        channel: {
            type: String,
            required: true,
            enum: ['whatsapp', 'email', 'sms'],
            index: true,
        },
        subject: {
            type: String,
            trim: true,
            // Required for email templates
        },
        body: {
            type: String,
            required: true,
        },
        variables: {
            type: [String],
            default: [],
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        isDefault: {
            type: Boolean,
            default: false,
        },
        usageCount: {
            type: Number,
            default: 0,
        },
        lastUsedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
        collection: 'notification_templates',
    }
);

// Compound indexes
NotificationTemplateSchema.index({ companyId: 1, category: 1, channel: 1 });
NotificationTemplateSchema.index({ companyId: 1, code: 1 }, { unique: true });
NotificationTemplateSchema.index({ category: 1, channel: 1, isDefault: 1 });

// Validation: Email templates must have subject
NotificationTemplateSchema.pre('save', function (next) {
    if (this.channel === 'email' && !this.subject) {
        return next(new Error('Email templates must have a subject'));
    }
    next();
});

// Methods
NotificationTemplateSchema.methods.incrementUsage = async function () {
    this.usageCount += 1;
    this.lastUsedAt = new Date();
    await this.save();
};

NotificationTemplateSchema.methods.renderTemplate = function (variables: Record<string, any>): { subject?: string; body: string } {
    let renderedBody = this.body;
    let renderedSubject = this.subject;

    // Replace all {{variable}} placeholders with actual values
    Object.keys(variables).forEach((key) => {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        renderedBody = renderedBody.replace(placeholder, variables[key] || '');
        if (renderedSubject) {
            renderedSubject = renderedSubject.replace(placeholder, variables[key] || '');
        }
    });

    return {
        subject: renderedSubject,
        body: renderedBody,
    };
};

// Statics
NotificationTemplateSchema.statics.getDefaultTemplate = async function (
    category: string,
    channel: string,
    companyId?: string
): Promise<INotificationTemplate | null> {
    // First try company-specific default
    if (companyId) {
        const companyTemplate = await this.findOne({
            companyId,
            category,
            channel,
            isDefault: true,
            isActive: true,
        });
        if (companyTemplate) return companyTemplate;
    }

    // Fall back to global default
    return this.findOne({
        companyId: null,
        category,
        channel,
        isDefault: true,
        isActive: true,
    });
};

const NotificationTemplate = mongoose.model<INotificationTemplate>(
    'NotificationTemplate',
    NotificationTemplateSchema
);

export default NotificationTemplate;
