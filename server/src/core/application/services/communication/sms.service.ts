/**
 * Sms
 * 
 * Purpose: Send an SMS message using Twilio
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

import twilioUtils from '../../../../shared/helpers/twilio.utils';
import logger from '../../../../shared/logger/winston.logger';

// Check if phone verification is enabled
const PHONE_VERIFICATION_ENABLED = process.env.TWILIO_PHONE_VERIFICATION_ENABLED === 'true';

/**
 * Send an SMS message using Twilio
 */
export const sendSMS = async (
  to: string,
  message: string
): Promise<boolean> => {
  return await twilioUtils.sendSMS(to, message);
};

/**
 * Send a verification code to a phone number
 */
export const sendVerificationCode = async (
  phoneNumber: string
): Promise<boolean> => {
  try {
    if (!PHONE_VERIFICATION_ENABLED) {
      logger.warn('Phone verification is disabled. Enable it in your .env file.');
      return false;
    }

    const twilioClient = twilioUtils.twilioClient;
    if (!twilioClient || !process.env.TWILIO_VERIFY_SERVICE_SID) {
      logger.error('Twilio client or Verify Service SID not initialized. Check your environment variables.');
      return false;
    }

    // Format the phone number (ensure it has the country code)
    const formattedPhone = twilioUtils.formatPhoneNumber(phoneNumber);

    // Use retry logic for sending verification code
    return await twilioUtils.retryWithExponentialBackoff(async () => {
      try {
        // Send the verification code
        await twilioClient.verify.v2
          .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
          .verifications.create({
            to: formattedPhone,
            channel: 'sms',
          });

        logger.info(`Verification code sent to ${formattedPhone}`);
        return true;
      } catch (error) {
        logger.error('Error sending verification code:', error);
        throw error;
      }
    });
  } catch (error) {
    logger.error('Error sending verification code:', error);
    return false;
  }
};

/**
 * Verify a phone number with the provided code
 */
export const verifyPhoneNumber = async (
  phoneNumber: string,
  code: string
): Promise<boolean> => {
  try {
    if (!PHONE_VERIFICATION_ENABLED) {
      logger.warn('Phone verification is disabled. Enable it in your .env file.');
      return false;
    }

    const twilioClient = twilioUtils.twilioClient;
    if (!twilioClient || !process.env.TWILIO_VERIFY_SERVICE_SID) {
      logger.error('Twilio client or Verify Service SID not initialized. Check your environment variables.');
      return false;
    }

    // Format the phone number (ensure it has the country code)
    const formattedPhone = twilioUtils.formatPhoneNumber(phoneNumber);

    // Use retry logic for verifying code
    return await twilioUtils.retryWithExponentialBackoff(async () => {
      try {
        // Verify the code
        const verification = await twilioClient.verify.v2
          .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
          .verificationChecks.create({
            to: formattedPhone,
            code,
          });

        const isValid = verification.status === 'approved';

        if (isValid) {
          logger.info(`Phone number ${formattedPhone} verified successfully`);
        } else {
          logger.warn(`Failed to verify phone number ${formattedPhone}`);
        }

        return isValid;
      } catch (error) {
        logger.error('Error verifying phone number:', error);
        throw error;
      }
    });
  } catch (error) {
    logger.error('Error verifying phone number:', error);
    return false;
  }
};

/**
 * Send a shipment status notification via SMS
 */
export const sendShipmentStatusSMS = async (
  phoneNumber: string,
  customerName: string,
  status: string,
  orderId: string,
  awbId: string
): Promise<boolean> => {
  try {
    const message = `Hello ${customerName}, your order #${orderId} with tracking number ${awbId} has been ${status}. Thank you for choosing Shipcrowd.`;
    return await sendSMS(phoneNumber, message);
  } catch (error) {
    logger.error('Error sending shipment status SMS:', error);
    return false;
  }
};


/**
 * Send a return status notification via SMS
 */
export const sendReturnStatusSMS = async (
  phoneNumber: string,
  customerName: string,
  returnId: string,
  status: string
): Promise<boolean> => {
  try {
    const statusMessageMap: Record<string, string> = {
      'requested': 'received',
      'approved': 'approved',
      'pickup_scheduled': 'scheduled for pickup',
      'picked_up': 'picked up',
      'received_at_warehouse': 'received at warehouse',
      'qc_pending': 'in QC',
      'qc_approved': 'QC passed',
      'qc_rejected': 'QC rejected',
      'refund_processed': 'refunded',
      'cancelled': 'cancelled'
    };

    const friendlyStatus = statusMessageMap[status] || status;
    const message = `Hello ${customerName}, your return #${returnId} is ${friendlyStatus}. Check app for details. - Shipcrowd`;

    return await sendSMS(phoneNumber, message);
  } catch (error) {
    logger.error('Error sending return status SMS:', error);
    return false;
  }
};

export default {
  sendSMS,
  sendVerificationCode,
  verifyPhoneNumber,
  sendShipmentStatusSMS,
  sendReturnStatusSMS,
};
