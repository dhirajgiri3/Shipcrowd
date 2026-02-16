import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import emailService from '../../../../core/application/services/communication/email.service';
import notificationService, { NotificationType } from '../../../../core/application/services/communication/notification.service';
import smsService from '../../../../core/application/services/communication/sms.service';
// Removed: NotificationService (CRM in-app notifications) - no longer used
import { ExternalServiceError, ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import logger from '../../../../shared/logger/winston.logger';
import { sendSuccess } from '../../../../shared/utils/responseHelper';

const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  html: z.string().optional(),
  text: z.string(),
});

const sendSMSSchema = z.object({
  to: z.string(),
  message: z.string(),
});

const sendVerificationCodeSchema = z.object({
  phoneNumber: z.string(),
});

const verifyPhoneNumberSchema = z.object({
  phoneNumber: z.string(),
  code: z.string(),
});

const sendShipmentStatusSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  customerName: z.string(),
  status: z.string(),
  orderId: z.string(),
  awbId: z.string(),
  notificationType: z.enum(['email', 'sms', 'whatsapp', 'both', 'all']).default('both'),
  productName: z.string().optional(),
  courierName: z.string().optional(),
});

// In-app notification schemas
const getNotificationsSchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  read: z.coerce.boolean().optional(),
  type: z.enum(['order', 'shipment', 'payment', 'system', 'alert']).optional(),
});

const markAsReadSchema = z.object({
  id: z.string(),
});

const getAuthUserId = (req: Request): string | undefined => {
  const user = (req as any).user;
  return user?._id || user?.userId;
};

export const sendEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validation = sendEmailSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError('Validation failed', validation.error.errors);
    }

    const result = await emailService.sendEmail(
      validation.data.to,
      validation.data.subject,
      validation.data.html || validation.data.text,
      validation.data.text
    );

    if (result) {
      sendSuccess(res, { success: true }, 'Email sent successfully');
    } else {
      throw new ExternalServiceError('Email', 'Failed to send email', ErrorCode.EXT_EMAIL_SEND_FAILED);
    }
  } catch (error) {
    next(error);
  }
};

export const sendSMS = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validation = sendSMSSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError('Validation failed', validation.error.errors);
    }

    let phoneNumber = validation.data.to;
    if (process.env.NODE_ENV === 'development' && process.env.TEST_PHONE_NUMBER) {
      phoneNumber = process.env.TEST_PHONE_NUMBER;
      logger.info(`[DEV MODE] Overriding recipient phone number to ${phoneNumber}`);
    }

    const result = await smsService.sendSMS(phoneNumber, validation.data.message);

    if (result) {
      sendSuccess(res, { success: true, to: phoneNumber }, 'SMS sent successfully');
    } else {
      throw new ExternalServiceError('SMS', 'Failed to send SMS', ErrorCode.EXT_SMS_SEND_FAILED);
    }
  } catch (error) {
    next(error);
  }
};

export const sendVerificationCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validation = sendVerificationCodeSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError('Validation failed', validation.error.errors);
    }

    const result = await smsService.sendVerificationCode(validation.data.phoneNumber);

    if (result) {
      sendSuccess(res, { success: true }, 'Verification code sent successfully');
    } else {
      throw new ExternalServiceError('SMS', 'Failed to send verification code', ErrorCode.EXT_SMS_SEND_FAILED);
    }
  } catch (error) {
    next(error);
  }
};

export const verifyPhoneNumber = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validation = verifyPhoneNumberSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError('Validation failed', validation.error.errors);
    }

    const result = await smsService.verifyPhoneNumber(validation.data.phoneNumber, validation.data.code);

    if (result) {
      sendSuccess(res, { success: true }, 'Phone number verified successfully');
    } else {
      throw new ValidationError('Invalid verification code');
    }
  } catch (error) {
    next(error);
  }
};

export const sendShipmentStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const auth = guardChecks(req);
    requireCompanyContext(auth);
    const validation = sendShipmentStatusSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError('Validation failed', validation.error.errors);
    }

    if (!validation.data.email && !validation.data.phone) {
      throw new ValidationError('At least one notification method (email or phone) is required');
    }

    const result = await notificationService.sendShipmentStatusNotification(
      { email: validation.data.email, phone: validation.data.phone },
      validation.data.customerName,
      validation.data.status,
      validation.data.orderId,
      validation.data.awbId,
      validation.data.notificationType as NotificationType,
      { productName: validation.data.productName, courierName: validation.data.courierName },
      auth.companyId
    );

    if (result.email || result.sms) {
      sendSuccess(res, { success: true, details: result }, 'Shipment status notification sent successfully');
    } else {
      throw new ExternalServiceError('Notification', 'Failed to send shipment status notification', ErrorCode.EXT_SERVICE_UNAVAILABLE);
    }
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// IN-APP NOTIFICATION CONTROLLERS - REMOVED
// ============================================================================
// In-app notification polling (bell icon) has been removed to improve performance.
// Critical notifications (RTO, disputes, etc.) are sent via Email/SMS/WhatsApp.
// See: Email/SMS notification controllers above

export default {
  sendEmail,
  sendSMS,
  sendVerificationCode,
  verifyPhoneNumber,
  sendShipmentStatus,
  // Removed in-app notification endpoints: getNotifications, markAsRead, markAllAsRead, getUnreadCount
};
