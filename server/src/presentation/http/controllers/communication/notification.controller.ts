import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import notificationService, { NotificationType } from '../../../../core/application/services/communication/notification.service';
import emailService from '../../../../core/application/services/communication/email.service';
import smsService from '../../../../core/application/services/communication/sms.service';
import logger from '../../../../shared/logger/winston.logger';
import { sendSuccess } from '../../../../shared/utils/responseHelper';
import { ValidationError, ExternalServiceError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';

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
      { productName: validation.data.productName, courierName: validation.data.courierName }
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

export default {
  sendEmail,
  sendSMS,
  sendVerificationCode,
  verifyPhoneNumber,
  sendShipmentStatus,
};
