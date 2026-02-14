import NotificationTemplate, {
  INotificationTemplate,
} from '@/infrastructure/database/mongoose/models/communication/notification-template.model';
import Notification, { INotification } from '@/infrastructure/database/mongoose/models/crm/communication/notification.model';
import { AppError, NotFoundError, ValidationError } from '@/shared/errors';
import logger from '@/shared/logger/winston.logger';
import mongoose from 'mongoose';

export type NotificationChannel = 'email' | 'whatsapp' | 'sms';
export type NotificationTrigger =
  | 'ticket_created'
  | 'ticket_assigned'
  | 'ticket_status_changed'
  | 'ticket_escalated'
  | 'dispute_created'
  | 'dispute_resolved'
  | 'callback_pending'
  | 'sla_breached'
  | 'manual';

const TRIGGER_TO_TEMPLATE_CODE: Record<NotificationTrigger, string> = {
  ticket_created: 'CRM_TICKET_CREATED',
  ticket_assigned: 'CRM_TICKET_ASSIGNED',
  ticket_status_changed: 'CRM_TICKET_STATUS_CHANGED',
  ticket_escalated: 'CRM_TICKET_ESCALATED',
  dispute_created: 'CRM_DISPUTE_CREATED',
  dispute_resolved: 'CRM_DISPUTE_RESOLVED',
  callback_pending: 'CRM_CALLBACK_PENDING',
  sla_breached: 'CRM_SLA_BREACHED',
  manual: 'CRM_MANUAL',
};

const TEMPLATE_CODE_TO_TRIGGER: Record<string, NotificationTrigger> = Object.entries(TRIGGER_TO_TEMPLATE_CODE).reduce(
  (acc, [trigger, code]) => {
    acc[code] = trigger as NotificationTrigger;
    return acc;
  },
  {} as Record<string, NotificationTrigger>
);

const normalizeVariables = (variables: unknown): string[] => {
  if (!Array.isArray(variables)) return [];
  return variables
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry === 'object' && 'name' in entry && typeof (entry as any).name === 'string') {
        return (entry as any).name;
      }
      return null;
    })
    .filter((value): value is string => Boolean(value));
};

type CRMTemplateInput = {
  name?: string;
  description?: string;
  channel?: NotificationChannel;
  trigger?: NotificationTrigger;
  subject?: string;
  body?: string;
  variables?: unknown;
  isActive?: boolean;
  company?: mongoose.Types.ObjectId | string | null;
  footer?: string;
};

export interface NotificationPayload {
  channel: NotificationChannel;
  trigger: NotificationTrigger;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientWhatsApp?: string;
  variables?: Record<string, string | number | boolean>;
  companyId?: string;
}

type LegacyNotificationTemplate = INotificationTemplate & {
  trigger?: NotificationTrigger;
  company?: mongoose.Types.ObjectId | null;
  footer?: string;
};

/**
 * NotificationService
 *
 * Handles multi-channel notifications:
 * - Email: via SendGrid or similar provider (not implemented in this stub)
 * - WhatsApp: via Twilio or similar provider (not implemented in this stub)
 * - SMS: via Twilio or SMS gateway (not implemented in this stub)
 *
 * This service primarily manages notification templates and orchestrates
 * the sending logic (actual sending would be done by respective providers).
 */
export class NotificationService {
  private toLegacyTemplate(template: INotificationTemplate): LegacyNotificationTemplate {
    const doc = template.toObject ? template.toObject() : template;
    return {
      ...(doc as LegacyNotificationTemplate),
      trigger: TEMPLATE_CODE_TO_TRIGGER[(doc as INotificationTemplate).code] || 'manual',
      company: (doc as any).companyId || null,
      footer: undefined,
    };
  }

  /**
   * Create a new notification template
   */
  async createTemplate(data: CRMTemplateInput): Promise<LegacyNotificationTemplate> {
    try {
      // Validate required fields
      if (!data.name || !data.channel || !data.trigger || !data.body) {
        throw new ValidationError('Missing required fields', {
          required: ['name', 'channel', 'trigger', 'body'],
        });
      }

      const templateDoc = await NotificationTemplate.create({
        companyId: data.company || null,
        name: data.name,
        code: TRIGGER_TO_TEMPLATE_CODE[data.trigger],
        category: 'general',
        channel: data.channel,
        subject: data.subject,
        body: data.footer ? `${data.body}\n${data.footer}` : data.body,
        variables: normalizeVariables(data.variables),
        isActive: data.isActive ?? true,
      });
      return this.toLegacyTemplate(templateDoc);
    } catch (error: any) {
      if (error instanceof ValidationError) throw error;
      throw new AppError(
        'Failed to create notification template',
        'SYS_INTERNAL_ERROR',
        500,
        false,
        error
      );
    }
  }

  /**
   * Get a template by ID
   */
  async getTemplate(id: string): Promise<LegacyNotificationTemplate> {
    const template = await NotificationTemplate.findById(id);
    if (!template) {
      throw new NotFoundError('Notification template not found');
    }
    return this.toLegacyTemplate(template);
  }

  /**
   * Get templates by channel and trigger
   */
  async getTemplatesByTrigger(
    trigger: NotificationTrigger,
    channel?: NotificationChannel,
    companyId?: string
  ): Promise<LegacyNotificationTemplate[]> {
    const query: any = {
      code: TRIGGER_TO_TEMPLATE_CODE[trigger],
      isActive: true,
    };

    if (channel) {
      query.channel = channel;
    }

    if (companyId) {
      // Get company-specific templates and system templates
      query.$or = [
        { companyId: new mongoose.Types.ObjectId(companyId) },
        { companyId: null },
      ];
    } else {
      // System templates only
      query.companyId = null;
    }

    const templates = await NotificationTemplate.find(query).sort({ createdAt: -1 });
    return templates.map((template) => this.toLegacyTemplate(template));
  }

  /**
   * Get all templates for a specific channel
   */
  async getTemplatesByChannel(
    channel: NotificationChannel,
    companyId?: string
  ): Promise<LegacyNotificationTemplate[]> {
    const query: any = {
      channel,
      isActive: true,
    };

    if (companyId) {
      query.$or = [
        { companyId: new mongoose.Types.ObjectId(companyId) },
        { companyId: null },
      ];
    } else {
      query.companyId = null;
    }

    const templates = await NotificationTemplate.find(query).sort({ code: 1, createdAt: -1 });
    return templates.map((template) => this.toLegacyTemplate(template));
  }

  /**
   * Update a notification template
   */
  async updateTemplate(id: string, data: CRMTemplateInput): Promise<LegacyNotificationTemplate> {
    const updateData: Record<string, unknown> = {
      ...data,
    };

    if (data.trigger) {
      updateData.code = TRIGGER_TO_TEMPLATE_CODE[data.trigger];
      delete updateData.trigger;
    }
    delete updateData.company;
    delete updateData.footer;
    if (Object.prototype.hasOwnProperty.call(data, 'company')) {
      updateData.companyId = data.company ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'footer') && typeof data.body === 'string') {
      updateData.body = `${data.body}\n${data.footer || ''}`.trim();
    }
    if (Object.prototype.hasOwnProperty.call(data, 'variables')) {
      updateData.variables = normalizeVariables(data.variables);
    }

    const template = await NotificationTemplate.findByIdAndUpdate(id, updateData, { new: true });
    if (!template) {
      throw new NotFoundError('Notification template not found');
    }
    return this.toLegacyTemplate(template);
  }

  /**
   * Delete a notification template (soft delete by setting isActive = false)
   */
  async deleteTemplate(id: string): Promise<void> {
    const result = await NotificationTemplate.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!result) {
      throw new NotFoundError('Notification template not found');
    }
  }

  /**
   * Send a notification (orchestrator method)
   * In a real system, this would call actual email/SMS/WhatsApp providers
   */
  async sendNotification(payload: NotificationPayload): Promise<{ success: boolean; messageId: string }> {
    try {
      const { channel, trigger, recipientEmail, recipientPhone, recipientWhatsApp, variables, companyId } = payload;

      // Get the template
      const templates = await this.getTemplatesByTrigger(trigger, channel, companyId);
      if (templates.length === 0) {
        logger.warn(`No template found for ${channel}/${trigger}`);
        return {
          success: false,
          messageId: '',
        };
      }

      const template = templates[0]; // Use first matching template
      const messageContent = this.interpolateTemplate(template, variables);

      // Route to appropriate sender based on channel
      switch (channel) {
        case 'email':
          return this.sendEmail(recipientEmail || '', messageContent);
        case 'whatsapp':
          return this.sendWhatsApp(recipientWhatsApp || '', messageContent);
        case 'sms':
          return this.sendSMS(recipientPhone || '', messageContent);
        default:
          throw new ValidationError('Unsupported notification channel', { channel });
      }
    } catch (error: any) {
      logger.error('Failed to send notification:', error);
      return {
        success: false,
        messageId: '',
      };
    }
  }

  /**
   * Send bulk notifications to multiple recipients
   */
  async sendBulkNotifications(
    payloads: NotificationPayload[]
  ): Promise<{ successful: number; failed: number; results: any[] }> {
    const results = [];
    let successful = 0;
    let failed = 0;

    for (const payload of payloads) {
      try {
        const result = await this.sendNotification(payload);
        if (result.success) {
          successful++;
        } else {
          failed++;
        }
        results.push(result);
      } catch (error: any) {
        failed++;
        logger.error('Error in bulk notification:', error);
        results.push({
          success: false,
          messageId: '',
          error: error.message,
        });
      }
    }

    return {
      successful,
      failed,
      results,
    };
  }

  /**
   * Get templates list with pagination
   */
  async getTemplates(
    filters: any = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ templates: LegacyNotificationTemplate[]; total: number; pages: number }> {
    const query: any = { isActive: true };

    if (filters.channel) query.channel = filters.channel;
    if (filters.trigger) {
      query.code = TRIGGER_TO_TEMPLATE_CODE[filters.trigger as NotificationTrigger];
    }
    if (filters.company) {
      query.companyId = new mongoose.Types.ObjectId(filters.company);
    }

    const total = await NotificationTemplate.countDocuments(query);
    const templates = await NotificationTemplate.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return {
      templates: templates.map((template) => this.toLegacyTemplate(template)),
      total,
      pages: Math.ceil(total / limit),
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Interpolate template with variables
   * Replaces {{variableName}} with actual values
   */
  private interpolateTemplate(
    template: LegacyNotificationTemplate,
    variables?: Record<string, string | number | boolean>
  ): {
    subject?: string;
    body: string;
    footer?: string;
  } {
    const vars = variables || {};

    const interpolate = (text: string): string => {
      let result = text;
      const regex = /\{\{(\w+)\}\}/g;

      result = result.replace(regex, (match, key) => {
        return String(vars[key] ?? match); // Keep original if not found
      });

      return result;
    };

    return {
      subject: template.subject ? interpolate(template.subject) : undefined,
      body: interpolate(template.body),
      footer: undefined,
    };
  }

  /**
   * Send email notification
   * TODO: Integrate with actual email provider (SendGrid, AWS SES, etc.)
   */
  private async sendEmail(
    recipientEmail: string,
    content: { subject?: string; body: string; footer?: string }
  ): Promise<{ success: boolean; messageId: string }> {
    try {
      if (!recipientEmail || !recipientEmail.includes('@')) {
        throw new ValidationError('Invalid email address', { email: recipientEmail });
      }

      // TODO: Call actual email provider API
      logger.info(`[EMAIL] Sending to ${recipientEmail}`, {
        subject: content.subject,
        bodyLength: content.body.length,
      });

      // Placeholder: generate a unique message ID
      const messageId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        success: true,
        messageId,
      };
    } catch (error: any) {
      logger.error('Email send failed:', error);
      return {
        success: false,
        messageId: '',
      };
    }
  }

  /**
   * Send WhatsApp notification
   * TODO: Integrate with actual WhatsApp provider (Twilio, Meta Business API, etc.)
   */
  private async sendWhatsApp(
    recipientPhone: string,
    content: { subject?: string; body: string; footer?: string }
  ): Promise<{ success: boolean; messageId: string }> {
    try {
      if (!recipientPhone || recipientPhone.length < 10) {
        throw new ValidationError('Invalid phone number', { phone: recipientPhone });
      }

      // TODO: Call actual WhatsApp provider API
      logger.info(`[WHATSAPP] Sending to ${recipientPhone}`, {
        bodyLength: content.body.length,
      });

      // Placeholder: generate a unique message ID
      const messageId = `whatsapp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        success: true,
        messageId,
      };
    } catch (error: any) {
      logger.error('WhatsApp send failed:', error);
      return {
        success: false,
        messageId: '',
      };
    }
  }

  /**
   * Send SMS notification
   * TODO: Integrate with actual SMS provider (Twilio, AWS SNS, etc.)
   */
  private async sendSMS(
    recipientPhone: string,
    content: { subject?: string; body: string; footer?: string }
  ): Promise<{ success: boolean; messageId: string }> {
    try {
      if (!recipientPhone || recipientPhone.length < 10) {
        throw new ValidationError('Invalid phone number', { phone: recipientPhone });
      }

      // Combine body and footer for SMS (keep it short)
      const fullMessage = content.footer ? `${content.body}\n${content.footer}` : content.body;

      if (fullMessage.length > 160) {
        logger.warn(`SMS message exceeds 160 chars (${fullMessage.length}), will be split`);
      }

      // TODO: Call actual SMS provider API
      logger.info(`[SMS] Sending to ${recipientPhone}`, {
        messageLength: fullMessage.length,
      });

      // Placeholder: generate a unique message ID
      const messageId = `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        success: true,
        messageId,
      };
    } catch (error: any) {
      logger.error('SMS send failed:', error);
      return {
        success: false,
        messageId: '',
      };
    }
  }

  // ============================================================================
  // IN-APP NOTIFICATION METHODS
  // ============================================================================

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(
    userId: string,
    filters: {
      page?: number;
      limit?: number;
      read?: boolean;
      type?: string;
    } = {}
  ): Promise<{
    notifications: INotification[];
    total: number;
    page: number;
    limit: number;
    unreadCount: number;
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;

    const query: any = {
      recipientId: new mongoose.Types.ObjectId(userId),
    };

    if (filters.read !== undefined) {
      query.read = filters.read;
    }

    if (filters.type) {
      query.type = filters.type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments(query),
      Notification.countDocuments({
        recipientId: new mongoose.Types.ObjectId(userId),
        read: false,
      }),
    ]);

    return {
      notifications,
      total,
      page,
      limit,
      unreadCount,
    };
  }

  /**
   * Mark a single notification as read
   */
  async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    const result = await Notification.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(notificationId),
        recipientId: new mongoose.Types.ObjectId(userId),
      },
      { read: true },
      { new: true }
    );

    if (!result) {
      throw new NotFoundError('Notification not found or access denied');
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await Notification.updateMany(
      {
        recipientId: new mongoose.Types.ObjectId(userId),
        read: false,
      },
      { read: true }
    );
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({
      recipientId: new mongoose.Types.ObjectId(userId),
      read: false,
    });
  }
}
