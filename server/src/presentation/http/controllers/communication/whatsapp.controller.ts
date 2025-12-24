import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import whatsappService from '../../../../core/application/services/communication/whatsapp.service';
import logger from '../../../../shared/logger/winston.logger';
import { sendSuccess, sendError, sendValidationError } from '../../../../shared/utils/responseHelper';

const sendWhatsAppMessageSchema = z.object({
  to: z.string(),
  templateName: z.string(),
  variables: z.record(z.string()).optional(),
});

const sendShipmentStatusSchema = z.object({
  to: z.string(),
  customerName: z.string(),
  status: z.string(),
  orderId: z.string(),
  awbId: z.string(),
});

const sendWelcomeSchema = z.object({
  to: z.string(),
  customerName: z.string(),
});

const sendDeliveryConfirmationSchema = z.object({
  to: z.string(),
  customerName: z.string(),
  orderId: z.string(),
  deliveryDate: z.string(),
});

export const sendWhatsAppMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validation = sendWhatsAppMessageSchema.safeParse(req.body);
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
    if (process.env.NODE_ENV === 'development' && process.env.TEST_WHATSAPP_NUMBER) {
      phoneNumber = process.env.TEST_WHATSAPP_NUMBER;
      console.log(`[DEV MODE] Overriding WhatsApp recipient to ${phoneNumber}`);
    }

    const result = await whatsappService.sendWhatsAppMessage(
      phoneNumber,
      validation.data.templateName,
      validation.data.variables || {}
    );

    if (result) {
      sendSuccess(res, { success: true, to: phoneNumber }, 'WhatsApp message sent successfully');
    } else {
      sendError(res, 'Failed to send WhatsApp message', 500, 'WHATSAPP_SEND_FAILED');
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

    let phoneNumber = validation.data.to;
    if (process.env.NODE_ENV === 'development' && process.env.TEST_WHATSAPP_NUMBER) {
      phoneNumber = process.env.TEST_WHATSAPP_NUMBER;
      console.log(`[DEV MODE] Overriding WhatsApp recipient to ${phoneNumber}`);
    }

    const result = await whatsappService.sendShipmentStatusWhatsApp(
      phoneNumber,
      validation.data.customerName,
      validation.data.status,
      validation.data.orderId,
      validation.data.awbId
    );

    if (result) {
      sendSuccess(res, { success: true, to: phoneNumber }, 'WhatsApp shipment status notification sent successfully');
    } else {
      sendError(res, 'Failed to send WhatsApp shipment status notification', 500, 'WHATSAPP_SEND_FAILED');
    }
  } catch (error) {
    next(error);
  }
};

export const sendWelcome = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validation = sendWelcomeSchema.safeParse(req.body);
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
    if (process.env.NODE_ENV === 'development' && process.env.TEST_WHATSAPP_NUMBER) {
      phoneNumber = process.env.TEST_WHATSAPP_NUMBER;
      console.log(`[DEV MODE] Overriding WhatsApp recipient to ${phoneNumber}`);
    }

    const result = await whatsappService.sendWelcomeWhatsApp(phoneNumber, validation.data.customerName);

    if (result) {
      sendSuccess(res, { success: true, to: phoneNumber }, 'WhatsApp welcome message sent successfully');
    } else {
      sendError(res, 'Failed to send WhatsApp welcome message', 500, 'WHATSAPP_SEND_FAILED');
    }
  } catch (error) {
    next(error);
  }
};

export const sendDeliveryConfirmation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validation = sendDeliveryConfirmationSchema.safeParse(req.body);
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
    if (process.env.NODE_ENV === 'development' && process.env.TEST_WHATSAPP_NUMBER) {
      phoneNumber = process.env.TEST_WHATSAPP_NUMBER;
      console.log(`[DEV MODE] Overriding WhatsApp recipient to ${phoneNumber}`);
    }

    const result = await whatsappService.sendDeliveryConfirmationWhatsApp(
      phoneNumber,
      validation.data.customerName,
      validation.data.orderId,
      validation.data.deliveryDate
    );

    if (result) {
      sendSuccess(res, { success: true, to: phoneNumber }, 'WhatsApp delivery confirmation sent successfully');
    } else {
      sendError(res, 'Failed to send WhatsApp delivery confirmation', 500, 'WHATSAPP_SEND_FAILED');
    }
  } catch (error) {
    next(error);
  }
};

export default {
  sendWhatsAppMessage,
  sendShipmentStatus,
  sendWelcome,
  sendDeliveryConfirmation
};
