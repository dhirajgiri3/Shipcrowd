import NotificationTemplate, { INotificationTemplate } from '../../../../infrastructure/database/mongoose/models/communication/notification-template.model';
import { NotFoundError, ValidationError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Notification Template Service
 *
 * Purpose: Manage reusable notification templates for WhatsApp, Email, SMS
 *
 * Features:
 * - CRUD operations for templates
 * - Template rendering with variable substitution
 * - Get default templates by category/channel
 * - Usage tracking
 * - Variable extraction from template body
 */

interface CreateTemplateData {
    companyId?: string;
    name: string;
    code: string;
    category: 'ndr' | 'rto' | 'delivery' | 'pickup' | 'cod' | 'general' | 'marketing';
    channel: 'whatsapp' | 'email' | 'sms';
    subject?: string;
    body: string;
    isDefault?: boolean;
}

interface UpdateTemplateData {
    name?: string;
    subject?: string;
    body?: string;
    isActive?: boolean;
    isDefault?: boolean;
}

interface RenderResult {
    subject?: string;
    body: string;
    missingVariables: string[];
}

class NotificationTemplateService {
    /**
     * Extract variables from template body
     * Finds all {{variable}} patterns
     */
    private extractVariables(text: string): string[] {
        const regex = /{{(\w+)}}/g;
        const variables: string[] = [];
        let match;

        while ((match = regex.exec(text)) !== null) {
            if (!variables.includes(match[1])) {
                variables.push(match[1]);
            }
        }

        return variables;
    }

    /**
     * Create a new notification template
     */
    async createTemplate(data: CreateTemplateData): Promise<INotificationTemplate> {
        // Extract variables from body and subject
        const bodyVariables = this.extractVariables(data.body);
        const subjectVariables = data.subject ? this.extractVariables(data.subject) : [];
        const allVariables = [...new Set([...bodyVariables, ...subjectVariables])];

        // Validate email templates have subject
        if (data.channel === 'email' && !data.subject) {
            throw new ValidationError('Email templates must have a subject');
        }

        // If setting as default, unset existing defaults
        if (data.isDefault) {
            await NotificationTemplate.updateMany(
                {
                    companyId: data.companyId || null,
                    category: data.category,
                    channel: data.channel,
                    isDefault: true,
                },
                { $set: { isDefault: false } }
            );
        }

        const template = await NotificationTemplate.create({
            companyId: data.companyId || null,
            name: data.name,
            code: data.code.toUpperCase(),
            category: data.category,
            channel: data.channel,
            subject: data.subject,
            body: data.body,
            variables: allVariables,
            isDefault: data.isDefault || false,
            isActive: true,
        });

        logger.info(`Notification template created: ${template.code} (${template.category}/${template.channel})`);

        return template;
    }

    /**
     * Update a template
     */
    async updateTemplate(
        templateId: string,
        companyId: string | undefined,
        updates: UpdateTemplateData
    ): Promise<INotificationTemplate> {
        const template = await NotificationTemplate.findById(templateId);

        if (!template) {
            throw new NotFoundError('Notification template not found');
        }

        // Verify ownership (only allow updating own templates or global if admin)
        const templateCompanyId = template.companyId ? template.companyId.toString() : null;
        const requestCompanyId = companyId || null;

        if (templateCompanyId !== requestCompanyId) {
            throw new ValidationError('Access denied: Cannot update this template');
        }

        // Update fields
        if (updates.name !== undefined) template.name = updates.name;
        if (updates.subject !== undefined) template.subject = updates.subject;
        if (updates.isActive !== undefined) template.isActive = updates.isActive;

        if (updates.body !== undefined) {
            template.body = updates.body;
            // Re-extract variables
            const bodyVariables = this.extractVariables(updates.body);
            const subjectVariables = template.subject ? this.extractVariables(template.subject) : [];
            template.variables = [...new Set([...bodyVariables, ...subjectVariables])];
        }

        // If setting as default, unset existing defaults
        if (updates.isDefault === true && !template.isDefault) {
            await NotificationTemplate.updateMany(
                {
                    companyId: template.companyId,
                    category: template.category,
                    channel: template.channel,
                    isDefault: true,
                    _id: { $ne: templateId },
                },
                { $set: { isDefault: false } }
            );
            template.isDefault = true;
        } else if (updates.isDefault === false) {
            template.isDefault = false;
        }

        await template.save();

        logger.info(`Notification template updated: ${template.code}`);

        return template;
    }

    /**
     * Delete a template
     */
    async deleteTemplate(templateId: string, companyId: string | undefined): Promise<boolean> {
        const template = await NotificationTemplate.findById(templateId);

        if (!template) {
            throw new NotFoundError('Notification template not found');
        }

        // Verify ownership
        const templateCompanyId = template.companyId ? template.companyId.toString() : null;
        const requestCompanyId = companyId || null;

        if (templateCompanyId !== requestCompanyId) {
            throw new ValidationError('Access denied: Cannot delete this template');
        }

        // Prevent deleting default templates (must set another as default first)
        if (template.isDefault) {
            throw new ValidationError('Cannot delete default template. Set another template as default first.');
        }

        await NotificationTemplate.deleteOne({ _id: templateId });

        logger.info(`Notification template deleted: ${template.code}`);

        return true;
    }

    /**
     * Get template by ID
     */
    async getTemplate(templateId: string): Promise<INotificationTemplate> {
        const template = await NotificationTemplate.findById(templateId);

        if (!template) {
            throw new NotFoundError('Notification template not found');
        }

        return template;
    }

    /**
     * Get template by code
     */
    async getTemplateByCode(code: string, companyId?: string): Promise<INotificationTemplate | null> {
        // Try company-specific first
        if (companyId) {
            const companyTemplate = await NotificationTemplate.findOne({
                companyId,
                code: code.toUpperCase(),
                isActive: true,
            });
            if (companyTemplate) return companyTemplate;
        }

        // Fall back to global
        return NotificationTemplate.findOne({
            companyId: null,
            code: code.toUpperCase(),
            isActive: true,
        });
    }

    /**
     * List templates with filters
     */
    async listTemplates(filters: {
        companyId?: string;
        category?: string;
        channel?: string;
        isActive?: boolean;
        includeGlobal?: boolean;
        limit?: number;
        skip?: number;
    }) {
        const query: any = {};

        // Company filter with global fallback option
        if (filters.companyId) {
            if (filters.includeGlobal) {
                query.$or = [
                    { companyId: filters.companyId },
                    { companyId: null },
                ];
            } else {
                query.companyId = filters.companyId;
            }
        } else {
            query.companyId = null; // Only global templates
        }

        if (filters.category) query.category = filters.category;
        if (filters.channel) query.channel = filters.channel;
        if (filters.isActive !== undefined) query.isActive = filters.isActive;

        const templates = await NotificationTemplate.find(query)
            .sort({ category: 1, channel: 1, name: 1 })
            .limit(filters.limit || 100)
            .skip(filters.skip || 0);

        const total = await NotificationTemplate.countDocuments(query);

        return {
            templates,
            total,
            page: Math.floor((filters.skip || 0) / (filters.limit || 100)) + 1,
            pages: Math.ceil(total / (filters.limit || 100)),
        };
    }

    /**
     * Get default template for a category/channel
     */
    async getDefaultTemplate(
        category: string,
        channel: string,
        companyId?: string
    ): Promise<INotificationTemplate | null> {
        return (NotificationTemplate as any).getDefaultTemplate(category, channel, companyId);
    }

    /**
     * Render template with variable substitution
     */
    async renderTemplate(
        templateId: string,
        variables: Record<string, any>
    ): Promise<RenderResult> {
        const template = await this.getTemplate(templateId);

        // Track usage
        await template.incrementUsage();

        // Render
        const rendered = template.renderTemplate(variables);

        // Find missing variables
        const providedVars = Object.keys(variables);
        const missingVariables = template.variables.filter((v) => !providedVars.includes(v));

        return {
            subject: rendered.subject,
            body: rendered.body,
            missingVariables,
        };
    }

    /**
     * Render template by code
     */
    async renderTemplateByCode(
        code: string,
        variables: Record<string, any>,
        companyId?: string
    ): Promise<RenderResult> {
        const template = await this.getTemplateByCode(code, companyId);

        if (!template) {
            throw new NotFoundError(`Template with code '${code}' not found`);
        }

        // Track usage
        await template.incrementUsage();

        // Render
        const rendered = template.renderTemplate(variables);

        // Find missing variables
        const providedVars = Object.keys(variables);
        const missingVariables = template.variables.filter((v) => !providedVars.includes(v));

        return {
            subject: rendered.subject,
            body: rendered.body,
            missingVariables,
        };
    }

    /**
     * Get template statistics
     */
    async getTemplateStats(companyId?: string) {
        const matchStage: any = companyId ? { companyId } : { companyId: null };

        const stats = await NotificationTemplate.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: { category: '$category', channel: '$channel' },
                    totalTemplates: { $sum: 1 },
                    activeTemplates: {
                        $sum: { $cond: ['$isActive', 1, 0] },
                    },
                    totalUsage: { $sum: '$usageCount' },
                },
            },
            {
                $project: {
                    _id: 0,
                    category: '$_id.category',
                    channel: '$_id.channel',
                    totalTemplates: 1,
                    activeTemplates: 1,
                    totalUsage: 1,
                },
            },
            { $sort: { category: 1, channel: 1 } },
        ]);

        return stats;
    }

    /**
     * Seed default global templates (for initial setup)
     */
    async seedDefaultTemplates(): Promise<void> {
        const defaultTemplates = [
            // NDR Templates
            {
                name: 'NDR Initial Contact - WhatsApp',
                code: 'NDR_INITIAL_CONTACT_WA',
                category: 'ndr' as const,
                channel: 'whatsapp' as const,
                body: `Hi {{customerName}},

We attempted to deliver your order {{orderId}} (AWB: {{awb}}) but encountered an issue:
"{{ndrReason}}"

Please reply with:
1️⃣ To reattempt delivery
2️⃣ To update delivery address
3️⃣ To cancel and return

Thank you,
Shipcrowd`,
                isDefault: true,
            },
            // RTO Templates
            {
                name: 'RTO Notification - WhatsApp',
                code: 'RTO_NOTIFICATION_WA',
                category: 'rto' as const,
                channel: 'whatsapp' as const,
                body: `Dear {{customerName}},

Your order {{orderId}} has been marked for Return to Origin (RTO).
Reason: {{rtoReason}}

The shipment will be returned to the seller. If you believe this is an error, please contact support immediately.

Reverse AWB: {{reverseAwb}}

Shipcrowd`,
                isDefault: true,
            },
            // Delivery Templates
            {
                name: 'Out for Delivery - WhatsApp',
                code: 'OUT_FOR_DELIVERY_WA',
                category: 'delivery' as const,
                channel: 'whatsapp' as const,
                body: `🚚 Great news, {{customerName}}!

Your order {{orderId}} is out for delivery today.
AWB: {{awb}}
Expected delivery: {{estimatedDelivery}}

Please keep your phone handy. Our delivery partner will contact you shortly.

Track: {{trackingUrl}}

Shipcrowd`,
                isDefault: true,
            },
            // COD Templates
            {
                name: 'COD Remittance Notification - Email',
                code: 'COD_REMITTANCE_EMAIL',
                category: 'cod' as const,
                channel: 'email' as const,
                subject: 'COD Remittance Processed - {{remittanceId}}',
                body: `<h2>COD Remittance Notification</h2>
<p>Dear Seller,</p>
<p>Your COD remittance has been processed successfully.</p>
<ul>
<li><strong>Remittance ID:</strong> {{remittanceId}}</li>
<li><strong>Amount:</strong> ₹{{amount}}</li>
<li><strong>UTR Number:</strong> {{utr}}</li>
<li><strong>Settlement Date:</strong> {{settlementDate}}</li>
</ul>
<p>The amount will be credited to your registered bank account within 1-2 business days.</p>
<p>Best regards,<br>Shipcrowd Team</p>`,
                isDefault: true,
            },
        ];

        for (const templateData of defaultTemplates) {
            const exists = await NotificationTemplate.findOne({
                code: templateData.code,
                companyId: null,
            });

            if (!exists) {
                await this.createTemplate(templateData);
                logger.info(`Seeded default template: ${templateData.code}`);
            }
        }
    }
}

export default new NotificationTemplateService();
