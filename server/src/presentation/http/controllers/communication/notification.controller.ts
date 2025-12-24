import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import notificationService, { NotificationType } from '../../../../core/application/services/communication/notification.service';
import emailService from '../../../../core/application/services/communication/email.service';
import smsService from '../../../../core/application/services/communication/sms.service';
import logger from '../../../../shared/logger/winston.logger';
import { sendSuccess, sendError, sendValidationError } from '../../../../shared/utils/responseHelper';

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
      const errors = validation.error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      sendValidationError(res, errors);
      return;
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
      sendError(res, 'Failed to send email', 500, 'EMAIL_SEND_FAILED');
    }
  } catch (error) {
    next(error);
  }
};

export const sendSMS = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validation = sendSMSSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      sendValidationError(res, errors);
      return;
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
      sendError(res, 'Failed to send SMS', 500, 'SMS_SEND_FAILED');
    }
  } catch (error) {
    next(error);
  }
};

export const sendVerificationCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validation = sendVerificationCodeSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      sendValidationError(res, errors);
      return;
    }

    const result = await smsService.sendVerificationCode(validation.data.phoneNumber);

    if (result) {
      sendSuccess(res, { success: true }, 'Verification code sent successfully');
    } else {
      sendError(res, 'Failed to send verification code', 500, 'VERIFICATION_SEND_FAILED');
    }
  } catch (error) {
    next(error);
  }
};

export const verifyPhoneNumber = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validation = verifyPhoneNumberSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      sendValidationError(res, errors);
      return;
    }

    const result = await smsService.verifyPhoneNumber(validation.data.phoneNumber, validation.data.code);

    if (result) {
      sendSuccess(res, { success: true }, 'Phone number verified successfully');
    } else {
      sendError(res, 'Invalid verification code', 400, 'INVALID_CODE');
    }
  } catch (error) {
    next(error);
  }
};

export const sendShipmentStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validation = sendShipmentStatusSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      sendValidationError(res, errors);
      return;
    }

    if (!validation.data.email && !validation.data.phone) {
      sendError(res, 'At least one notification method (email or phone) is required', 400, 'MISSING_CONTACT');
      return;
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
      sendError(res, 'Failed to send shipment status notification', 500, 'NOTIFICATION_FAILED');
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
