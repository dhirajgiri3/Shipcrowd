/**
 * Notification
 * 
 * Purpose: Notification types
 * 
 * DEPENDENCIES:
 * - Logger
 * 
 * TESTING:
 * Unit Tests: tests/unit/services/.../{filename}.test.ts
 * Coverage: TBD
 * 
 * NOTE: This service needs comprehensive documentation.
 * See SERVICE_TEMPLATE.md for documentation standards.
 */

import logger from '../../../../shared/logger/winston.logger';
import emailService from './email.service';
import NotificationPreferenceService from './notification-preferences.service';
import smsService from './sms.service';
import whatsappService from './whatsapp.service';

/**
 * Notification types
 */
export enum NotificationType {
  EMAIL = 'email',
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  BOTH = 'both',
  ALL = 'all',
}

/**
 * Notification channels configuration
 */
export interface NotificationChannels {
  email?: boolean;
  sms?: boolean;
  whatsapp?: boolean;
}

/**
 * Send a notification through specified channels
 */
export const sendNotification = async (
  to: {
    email?: string;
    phone?: string;
  },
  subject: string,
  content: {
    html?: string;
    text: string;
  },
  channels: NotificationChannels = { email: true, sms: false, whatsapp: false }
): Promise<{
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}> => {
  const results = {
    email: false,
    sms: false,
    whatsapp: false,
  };

  try {
    // Send email if enabled and recipient email is provided
    if (channels.email && to.email) {
      results.email = await emailService.sendEmail(
        to.email,
        subject,
        content.html || content.text,
        content.text
      );
    }

    // Send SMS if enabled and recipient phone is provided
    if (channels.sms && to.phone) {
      results.sms = await smsService.sendSMS(to.phone, content.text);
    }

    // Send WhatsApp if enabled and recipient phone is provided
    if (channels.whatsapp && to.phone) {
      // Use a generic template for simple messages
      results.whatsapp = await whatsappService.sendWhatsAppMessage(
        to.phone,
        'GENERAL_MESSAGE',
        { '1': content.text }
      );
    }

    return results;
  } catch (error) {
    logger.error('Error sending notification:', error);
    return results;
  }
};

/**
 * Send a verification notification
 */
export const sendVerificationNotification = async (
  to: {
    email?: string;
    phone?: string;
  },
  name: string,
  token: string,
  type: NotificationType = NotificationType.EMAIL
): Promise<{
  email: boolean;
  sms: boolean;
}> => {
  const results = {
    email: false,
    sms: false,
  };

  try {
    // Send email verification
    if ((type === NotificationType.EMAIL || type === NotificationType.BOTH) && to.email) {
      results.email = await emailService.sendVerificationEmail(to.email, name, token);
    }

    // Send SMS verification
    if ((type === NotificationType.SMS || type === NotificationType.BOTH) && to.phone) {
      results.sms = await smsService.sendVerificationCode(to.phone);
    }

    return results;
  } catch (error) {
    logger.error('Error sending verification notification:', error);
    return results;
  }
};

/**
 * Send a password reset notification
 */
export const sendPasswordResetNotification = async (
  to: {
    email?: string;
    phone?: string;
  },
  name: string,
  token: string,
  type: NotificationType = NotificationType.EMAIL
): Promise<{
  email: boolean;
  sms: boolean;
}> => {
  const results = {
    email: false,
    sms: false,
  };

  try {
    // Send email password reset
    if ((type === NotificationType.EMAIL || type === NotificationType.BOTH) && to.email) {
      results.email = await emailService.sendPasswordResetEmail(to.email, name, token);
    }

    // Send SMS password reset (simplified message)
    if ((type === NotificationType.SMS || type === NotificationType.BOTH) && to.phone) {
      const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
      const message = `Hello ${name}, you requested a password reset. Use this link to reset your password: ${resetUrl}`;
      results.sms = await smsService.sendSMS(to.phone, message);
    }

    return results;
  } catch (error) {
    logger.error('Error sending password reset notification:', error);
    return results;
  }
};

/**
 * Send a welcome notification
 */
export const sendWelcomeNotification = async (
  to: {
    email?: string;
    phone?: string;
  },
  name: string,
  type: NotificationType = NotificationType.EMAIL
): Promise<{
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}> => {
  const results = {
    email: false,
    sms: false,
    whatsapp: false,
  };

  try {
    // Send welcome email
    if ((type === NotificationType.EMAIL || type === NotificationType.BOTH || type === NotificationType.ALL) && to.email) {
      results.email = await emailService.sendWelcomeEmail(to.email, name);
    }

    // Send welcome SMS
    if ((type === NotificationType.SMS || type === NotificationType.BOTH || type === NotificationType.ALL) && to.phone) {
      const message = `Welcome to Shipcrowd, ${name}! We're excited to have you on board. If you have any questions, please don't hesitate to contact our support team.`;
      results.sms = await smsService.sendSMS(to.phone, message);
    }

    // Send welcome WhatsApp
    if ((type === NotificationType.WHATSAPP || type === NotificationType.ALL) && to.phone) {
      results.whatsapp = await whatsappService.sendWelcomeWhatsApp(to.phone, name);
    }

    return results;
  } catch (error) {
    logger.error('Error sending welcome notification:', error);
    return results;
  }
};

/**
 * Send a shipment status notification
 */
export const sendShipmentStatusNotification = async (
  to: {
    email?: string;
    phone?: string;
  },
  customerName: string,
  status: string,
  orderId: string,
  awbId: string,
  type: NotificationType = NotificationType.BOTH,
  additionalInfo?: {
    productName?: string;
    courierName?: string;
  },
  companyId?: string
): Promise<{
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}> => {
  const results = {
    email: false,
    sms: false,
    whatsapp: false,
  };

  try {
    const canSendEmail = companyId ? await NotificationPreferenceService.shouldSend(companyId, 'email') : true;
    const canSendSms = companyId ? await NotificationPreferenceService.shouldSend(companyId, 'sms') : true;
    const canSendWhatsApp = companyId ? await NotificationPreferenceService.shouldSend(companyId, 'whatsapp') : true;

    // Send shipment status email
    if ((type === NotificationType.EMAIL || type === NotificationType.BOTH || type === NotificationType.ALL) && to.email && canSendEmail) {
      results.email = await emailService.sendShipmentStatusEmail(
        to.email,
        customerName,
        status,
        orderId,
        awbId,
        additionalInfo?.productName,
        additionalInfo?.courierName
      );
    }

    // Send shipment status SMS
    if ((type === NotificationType.SMS || type === NotificationType.BOTH || type === NotificationType.ALL) && to.phone && canSendSms) {
      results.sms = await smsService.sendShipmentStatusSMS(
        to.phone,
        customerName,
        status,
        orderId,
        awbId
      );
    }

    // Send shipment status WhatsApp
    if ((type === NotificationType.WHATSAPP || type === NotificationType.ALL) && to.phone && canSendWhatsApp) {
      results.whatsapp = await whatsappService.sendShipmentStatusWhatsApp(
        to.phone,
        customerName,
        status,
        orderId,
        awbId
      );
    }

    return results;
  } catch (error) {
    logger.error('Error sending shipment status notification:', error);
    return results;
  }
};

/**
 * Send a return status notification
 */
export const sendReturnStatusNotification = async (
  to: {
    email?: string;
    phone?: string;
  },
  customerName: string,
  returnId: string,
  status: string,
  productNames: string[],
  details?: {
    refundAmount?: number;
    pickupDate?: Date;
    rejectionReason?: string;
    refundTransactionId?: string;
  },
  type: NotificationType = NotificationType.BOTH
): Promise<{
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}> => {
  const results = {
    email: false,
    sms: false,
    whatsapp: false,
  };

  try {
    // Send return status email
    if ((type === NotificationType.EMAIL || type === NotificationType.BOTH || type === NotificationType.ALL) && to.email) {
      results.email = await emailService.sendReturnStatusEmail(
        to.email,
        customerName,
        returnId,
        status,
        productNames,
        false, // Action required
        details
      );
    }

    // Send return status SMS
    if ((type === NotificationType.SMS || type === NotificationType.BOTH || type === NotificationType.ALL) && to.phone) {
      results.sms = await smsService.sendReturnStatusSMS(
        to.phone,
        customerName,
        returnId,
        status
      );
    }

    // Send return status WhatsApp (placeholder for now)
    if ((type === NotificationType.WHATSAPP || type === NotificationType.ALL) && to.phone) {
      // Future implementation
      // results.whatsapp = await whatsappService.sendReturnStatusWhatsApp(...);
    }

    return results;
  } catch (error) {
    logger.error('Error sending return status notification:', error);
    return results;
  }
};

export default {
  sendNotification,
  sendVerificationNotification,
  sendPasswordResetNotification,
  sendWelcomeNotification,
  sendShipmentStatusNotification,
  sendReturnStatusNotification,
  NotificationType,
};
