import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import whatsappService from '../services/whatsapp.service';
import logger from '../utils/logger';

// Validation schemas
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

/**
 * Send a WhatsApp message
 * @route POST /whatsapp/message
 */
export const sendWhatsAppMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = sendWhatsAppMessageSchema.parse(req.body);
    
    // Always use test phone number in development mode
    let phoneNumber = validatedData.to;
    if (process.env.NODE_ENV === 'development' && process.env.TEST_WHATSAPP_NUMBER) {
      phoneNumber = process.env.TEST_WHATSAPP_NUMBER;
      console.log(`[DEV MODE] Overriding WhatsApp recipient to ${phoneNumber}`);
    }
    
    const result = await whatsappService.sendWhatsAppMessage(
      phoneNumber,
      validatedData.templateName,
      validatedData.variables || {}
    );
    
    if (result) {
      res.status(200).json({ 
        success: true, 
        message: 'WhatsApp message sent successfully',
        to: phoneNumber
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send WhatsApp message',
        to: phoneNumber
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Send a shipment status notification via WhatsApp
 * @route POST /whatsapp/shipment-status
 */
export const sendShipmentStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = sendShipmentStatusSchema.parse(req.body);
    
    // Always use test phone number in development mode
    let phoneNumber = validatedData.to;
    if (process.env.NODE_ENV === 'development' && process.env.TEST_WHATSAPP_NUMBER) {
      phoneNumber = process.env.TEST_WHATSAPP_NUMBER;
      console.log(`[DEV MODE] Overriding WhatsApp recipient to ${phoneNumber}`);
    }
    
    const result = await whatsappService.sendShipmentStatusWhatsApp(
      phoneNumber,
      validatedData.customerName,
      validatedData.status,
      validatedData.orderId,
      validatedData.awbId
    );
    
    if (result) {
      res.status(200).json({ 
        success: true, 
        message: 'WhatsApp shipment status notification sent successfully',
        to: phoneNumber
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send WhatsApp shipment status notification',
        to: phoneNumber
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Send a welcome message via WhatsApp
 * @route POST /whatsapp/welcome
 */
export const sendWelcome = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = sendWelcomeSchema.parse(req.body);
    
    // Always use test phone number in development mode
    let phoneNumber = validatedData.to;
    if (process.env.NODE_ENV === 'development' && process.env.TEST_WHATSAPP_NUMBER) {
      phoneNumber = process.env.TEST_WHATSAPP_NUMBER;
      console.log(`[DEV MODE] Overriding WhatsApp recipient to ${phoneNumber}`);
    }
    
    const result = await whatsappService.sendWelcomeWhatsApp(
      phoneNumber,
      validatedData.customerName
    );
    
    if (result) {
      res.status(200).json({ 
        success: true, 
        message: 'WhatsApp welcome message sent successfully',
        to: phoneNumber
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send WhatsApp welcome message',
        to: phoneNumber
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Send a delivery confirmation via WhatsApp
 * @route POST /whatsapp/delivery-confirmation
 */
export const sendDeliveryConfirmation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = sendDeliveryConfirmationSchema.parse(req.body);
    
    // Always use test phone number in development mode
    let phoneNumber = validatedData.to;
    if (process.env.NODE_ENV === 'development' && process.env.TEST_WHATSAPP_NUMBER) {
      phoneNumber = process.env.TEST_WHATSAPP_NUMBER;
      console.log(`[DEV MODE] Overriding WhatsApp recipient to ${phoneNumber}`);
    }
    
    const result = await whatsappService.sendDeliveryConfirmationWhatsApp(
      phoneNumber,
      validatedData.customerName,
      validatedData.orderId,
      validatedData.deliveryDate
    );
    
    if (result) {
      res.status(200).json({ 
        success: true, 
        message: 'WhatsApp delivery confirmation sent successfully',
        to: phoneNumber
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send WhatsApp delivery confirmation',
        to: phoneNumber
      });
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
