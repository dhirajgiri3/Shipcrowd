import NotificationTemplate, {
  NotificationChannel,
  NotificationTrigger,
  INotificationTemplate,
} from '@/infrastructure/database/mongoose/models/crm/communication/notification-template.model';
import { AppError, NotFoundError, ValidationError } from '@/shared/errors';
import logger from '@/shared/logger/winston.logger';
import mongoose from 'mongoose';

export interface NotificationPayload {
  channel: NotificationChannel;
  trigger: NotificationTrigger;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientWhatsApp?: string;
  variables?: Record<string, string | number | boolean>;
  companyId?: string;
}

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
  /**
   * Create a new notification template
   */
  async createTemplate(data: Partial<INotificationTemplate>): Promise<INotificationTemplate> {
    try {
      // Validate required fields
      if (!data.name || !data.channel || !data.trigger || !data.body) {
        throw new ValidationError('Missing required fields', {
          required: ['name', 'channel', 'trigger', 'body'],
        });
      }

      const template = await NotificationTemplate.create(data);
      return template;
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
  async getTemplate(id: string): Promise<INotificationTemplate> {
    const template = await NotificationTemplate.findById(id);
    if (!template) {
      throw new NotFoundError('Notification template not found');
    }
    return template;
  }

  /**
   * Get templates by channel and trigger
   */
  async getTemplatesByTrigger(
    trigger: NotificationTrigger,
    channel?: NotificationChannel,
    companyId?: string
  ): Promise<INotificationTemplate[]> {
    const query: any = {
      trigger,
      isActive: true,
    };

    if (channel) {
      query.channel = channel;
    }

    if (companyId) {
      // Get company-specific templates and system templates
      query.$or = [
        { company: new mongoose.Types.ObjectId(companyId) },
        { company: null },
      ];
    } else {
      // System templates only
      query.company = null;
    }

    return NotificationTemplate.find(query).sort({ createdAt: -1 }).lean();
  }

  /**
   * Get all templates for a specific channel
   */
  async getTemplatesByChannel(
    channel: NotificationChannel,
    companyId?: string
  ): Promise<INotificationTemplate[]> {
    const query: any = {
      channel,
      isActive: true,
    };

    if (companyId) {
      query.$or = [
        { company: new mongoose.Types.ObjectId(companyId) },
        { company: null },
      ];
    } else {
      query.company = null;
    }

    return NotificationTemplate.find(query).sort({ trigger: 1, createdAt: -1 }).lean();
  }

  /**
   * Update a notification template
   */
  async updateTemplate(id: string, data: Partial<INotificationTemplate>): Promise<INotificationTemplate> {
    const template = await NotificationTemplate.findByIdAndUpdate(id, data, { new: true });
    if (!template) {
      throw new NotFoundError('Notification template not found');
    }
    return template;
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
  ): Promise<{ templates: INotificationTemplate[]; total: number; pages: number }> {
    const query: any = { isActive: true };

    if (filters.channel) query.channel = filters.channel;
    if (filters.trigger) query.trigger = filters.trigger;
    if (filters.company) {
      query.company = new mongoose.Types.ObjectId(filters.company);
    }

    const total = await NotificationTemplate.countDocuments(query);
    const templates = await NotificationTemplate.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return {
      templates,
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
    template: INotificationTemplate,
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
      footer: template.footer ? interpolate(template.footer) : undefined,
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
}
