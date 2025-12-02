import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import notificationService, { NotificationType } from '../services/notification.service';
import emailService from '../services/email.service';
import smsService from '../services/sms.service';
import logger from '../utils/logger';

// Validation schemas
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

/**
 * Send an email
 * @route POST /notifications/email
 */
export const sendEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = sendEmailSchema.parse(req.body);

    const result = await emailService.sendEmail(
      validatedData.to,
      validatedData.subject,
      validatedData.html || validatedData.text,
      validatedData.text
    );

    if (result) {
      res.status(200).json({ success: true, message: 'Email sent successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to send email' });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Send an SMS
 * @route POST /notifications/sms
 */
export const sendSMS = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = sendSMSSchema.parse(req.body);

    // Always use your phone number for testing in development mode
    let phoneNumber = validatedData.to;
    if (process.env.NODE_ENV === 'development' && process.env.TEST_PHONE_NUMBER) {
      phoneNumber = process.env.TEST_PHONE_NUMBER;
      console.log(`[DEV MODE] Overriding recipient phone number to ${phoneNumber}`);
    }

    const result = await smsService.sendSMS(
      phoneNumber,
      validatedData.message
    );

    if (result) {
      res.status(200).json({
        success: true,
        message: 'SMS sent successfully',
        to: phoneNumber
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send SMS',
        to: phoneNumber
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Send a verification code via SMS
 * @route POST /notifications/verify-phone/send
 */
export const sendVerificationCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = sendVerificationCodeSchema.parse(req.body);

    const result = await smsService.sendVerificationCode(validatedData.phoneNumber);

    if (result) {
      res.status(200).json({ success: true, message: 'Verification code sent successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to send verification code' });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Verify a phone number with a code
 * @route POST /notifications/verify-phone/check
 */
export const verifyPhoneNumber = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = verifyPhoneNumberSchema.parse(req.body);

    const result = await smsService.verifyPhoneNumber(
      validatedData.phoneNumber,
      validatedData.code
    );

    if (result) {
      res.status(200).json({ success: true, message: 'Phone number verified successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid verification code' });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Send a shipment status notification (email, SMS, or both)
 * @route POST /notifications/shipment-status
 */
export const sendShipmentStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = sendShipmentStatusSchema.parse(req.body);

    // Ensure at least one notification method is provided
    if (!validatedData.email && !validatedData.phone) {
      res.status(400).json({ success: false, message: 'At least one notification method (email or phone) is required' });
      return;
    }

    const result = await notificationService.sendShipmentStatusNotification(
      {
        email: validatedData.email,
        phone: validatedData.phone,
      },
      validatedData.customerName,
      validatedData.status,
      validatedData.orderId,
      validatedData.awbId,
      validatedData.notificationType as NotificationType,
      {
        productName: validatedData.productName,
        courierName: validatedData.courierName,
      }
    );

    if (result.email || result.sms) {
      res.status(200).json({
        success: true,
        message: 'Shipment status notification sent successfully',
        details: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send shipment status notification',
        details: result
      });
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
