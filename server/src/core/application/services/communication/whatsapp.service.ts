/**
 * Whatsapp
 * 
 * Purpose: Send a WhatsApp message using Twilio
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
import twilioUtils from '../../../../shared/helpers/twilio.utils';

/**
 * Send a WhatsApp message using Twilio
 */
export const sendWhatsAppMessage = async (
  to: string,
  templateName: string,
  variables: Record<string, string> = {}
): Promise<boolean> => {
  try {
    // Get the Twilio client
    const twilioClient = twilioUtils.twilioClient;
    if (!twilioClient) {
      logger.error('Twilio client not initialized. Check your environment variables.');
      return false;
    }

    // Format the phone number (ensure it has the country code)
    const formattedPhone = twilioUtils.formatPhoneNumber(to);

    // Add whatsapp: prefix if not already present
    const whatsappTo = formattedPhone.startsWith('whatsapp:')
      ? formattedPhone
      : `whatsapp:${formattedPhone}`;

    // Get the WhatsApp from number from environment variables
    const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

    // Log the WhatsApp message details
    logger.info('Sending WhatsApp message:', {
      to: whatsappTo,
      from: whatsappFrom,
      template: templateName,
      variables
    });

    // In development mode, just log the message
    if (process.env.NODE_ENV !== 'production' && process.env.WHATSAPP_DEV_MODE === 'true') {
      logger.info(`[DEV MODE] WhatsApp message to ${whatsappTo}: Template=${templateName}, Variables=${JSON.stringify(variables)}`);
      return true;
    }

    // Prepare the message body based on the template and variables
    let body = '';

    // For the example you provided with contentSid
    if (templateName === 'APPOINTMENT_REMINDER') {
      // Use the direct approach with contentSid and contentVariables
      const contentSid = process.env.TWILIO_WHATSAPP_TEMPLATE_APPOINTMENT_REMINDER || 'HXb5b62575e6e4ff6129ad7c8efe1f983e';
      const contentVariables = JSON.stringify(variables);

      // Send the WhatsApp message with contentSid
      const result = await twilioClient.messages.create({
        from: whatsappFrom,
        contentSid,
        contentVariables,
        to: whatsappTo
      });

      logger.info(`WhatsApp message sent successfully to ${whatsappTo} with SID: ${result.sid}`);
      return true;
    }

    // For other templates, use the standard approach with body text
    switch (templateName) {
      case 'SHIPMENT_STATUS':
        body = `Hello ${variables['1']}, your order #${variables['2']} with tracking number ${variables['3']} has been ${variables['4']}. Thank you for choosing Shipcrowd.`;
        break;
      case 'WELCOME':
        body = `Welcome to Shipcrowd, ${variables['1']}! We're excited to have you on board. If you have any questions, please don't hesitate to contact our support team.`;
        break;
      case 'DELIVERY_CONFIRMATION':
        body = `Hello ${variables['1']}, your order #${variables['2']} has been delivered on ${variables['3']}. Thank you for choosing Shipcrowd.`;
        break;
      default:
        // For custom messages
        body = `Message from Shipcrowd: ${Object.values(variables).join(' ')}`;
    }

    // Send the WhatsApp message with body text
    const result = await twilioClient.messages.create({
      from: whatsappFrom,
      body,
      to: whatsappTo
    });

    logger.info(`WhatsApp message sent successfully to ${whatsappTo} with SID: ${result.sid}`, {
      status: result.status,
      direction: result.direction,
      dateCreated: result.dateCreated,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage
    });

    return true;
  } catch (error: any) {
    logger.error('Error sending WhatsApp message:', {
      message: error.message,
      code: error.code,
      status: error.status,
      moreInfo: error.moreInfo,
      details: error.details
    });

    // If we're in development mode, return true anyway to simulate success
    if (process.env.NODE_ENV !== 'production') {
      logger.info('[DEV MODE] Simulating successful WhatsApp message despite error');
      return true;
    }

    return false;
  }
};

/**
 * Send a shipment status notification via WhatsApp
 */
export const sendShipmentStatusWhatsApp = async (
  phoneNumber: string,
  customerName: string,
  status: string,
  orderId: string,
  awbId: string
): Promise<boolean> => {
  try {
    // Use the appropriate template for shipment status
    const templateName = 'SHIPMENT_STATUS';

    // Prepare variables for the template
    const variables = {
      '1': customerName,
      '2': orderId,
      '3': awbId,
      '4': status,
      '5': new Date().toLocaleDateString()
    };

    return await sendWhatsAppMessage(phoneNumber, templateName, variables);
  } catch (error) {
    logger.error('Error sending shipment status WhatsApp message:', error);
    return false;
  }
};

/**
 * Send a welcome message via WhatsApp
 */
export const sendWelcomeWhatsApp = async (
  phoneNumber: string,
  customerName: string
): Promise<boolean> => {
  try {
    // Use the welcome template
    const templateName = 'WELCOME';

    // Prepare variables for the template
    const variables = {
      '1': customerName
    };

    return await sendWhatsAppMessage(phoneNumber, templateName, variables);
  } catch (error) {
    logger.error('Error sending welcome WhatsApp message:', error);
    return false;
  }
};

/**
 * Send a delivery confirmation via WhatsApp
 */
export const sendDeliveryConfirmationWhatsApp = async (
  phoneNumber: string,
  customerName: string,
  orderId: string,
  deliveryDate: string
): Promise<boolean> => {
  try {
    // Use the delivery confirmation template
    const templateName = 'DELIVERY_CONFIRMATION';

    // Prepare variables for the template
    const variables = {
      '1': customerName,
      '2': orderId,
      '3': deliveryDate
    };

    return await sendWhatsAppMessage(phoneNumber, templateName, variables);
  } catch (error) {
    logger.error('Error sending delivery confirmation WhatsApp message:', error);
    return false;
  }
};

export default {
  sendWhatsAppMessage,
  sendShipmentStatusWhatsApp,
  sendWelcomeWhatsApp,
  sendDeliveryConfirmationWhatsApp
};
