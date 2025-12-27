import twilio from 'twilio';
import logger from '../logger/winston.logger';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Twilio client with error handling
let twilioClient = null;
try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    logger.info('Twilio client initialized successfully');
  } else {
    logger.warn('Twilio credentials not found, running in development mode only');
  }
} catch (error) {
  logger.error('Failed to initialize Twilio client:', error);
}

const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

// Custom error types
export class TwilioError extends Error {
  code: string;
  details: any;

  constructor(message: string, code: string, details: any = {}) {
    super(message);
    this.name = 'TwilioError';
    this.code = code;
    this.details = details;
  }
}

// Error codes mapping
export const ERROR_CODES = {
  INVALID_PHONE: 'INVALID_PHONE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TWILIO_SERVICE_ERROR: 'TWILIO_SERVICE_ERROR',
  OTP_EXPIRED: 'OTP_EXPIRED',
  INVALID_OTP: 'INVALID_OTP',
  MAX_RETRIES_EXCEEDED: 'MAX_RETRIES_EXCEEDED'
};

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 5000
};

// Helper function to implement exponential backoff
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isRetryableError = (error: any) => {
  const retryableCodes = ['30001', '30002', '30003', '30004', '30005'];
  return error.code && retryableCodes.includes(error.code.toString());
};

export const retryWithExponentialBackoff = async <T>(operation: () => Promise<T>, retryCount = 0): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    if (retryCount >= RETRY_CONFIG.maxRetries || !isRetryableError(error)) {
      throw error;
    }

    const delay = Math.min(
      RETRY_CONFIG.initialDelay * Math.pow(2, retryCount),
      RETRY_CONFIG.maxDelay
    );

    logger.warn(`Retrying operation after ${delay}ms (attempt ${retryCount + 1})`);
    await sleep(delay);
    return retryWithExponentialBackoff(operation, retryCount + 1);
  }
};

/**
 * Helper function to format phone numbers
 * Ensures the phone number has a country code (defaults to India +91)
 */
export const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove any non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, '');

  // If the number already has a country code (starts with +), return as is
  if (phoneNumber.startsWith('+')) {
    return phoneNumber;
  }

  // If the number is 10 digits (Indian number without country code), add +91
  if (digitsOnly.length === 10) {
    return `+91${digitsOnly}`;
  }

  // Otherwise, just add a + at the beginning if it doesn't have one
  return phoneNumber.startsWith('+') ? phoneNumber : `+${digitsOnly}`;
};

/**
 * Send an SMS message using Twilio with retry logic
 *
 * This implementation uses the Twilio Messages API directly as shown in the curl example:
 * curl 'https://api.twilio.com/2010-04-01/Accounts/AC5da69168964c96784ad53d32568c940a/Messages.json' -X POST \
 * --data-urlencode 'To=+919904392992' \
 * --data-urlencode 'From=+16205511320' \
 * --data-urlencode 'Body=hello' \
 * -u AC5da69168964c96784ad53d32568c940a:0a6ef05aed399c22cd63661a7c0ee852
 */
export const sendSMS = async (
  to: string,
  message: string
): Promise<boolean> => {
  try {
    // Format the phone number (ensure it has the country code)
    const formattedPhone = formatPhoneNumber(to);

    // Log the message in development mode, but still send it
    if (process.env.NODE_ENV !== 'production') {
      logger.info(`[DEV MODE] Sending real SMS to ${formattedPhone}: ${message}`);
      // Continue with sending the actual SMS
    }

    // Check for required environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken) {
      logger.error('Twilio credentials not found. Check your environment variables.');
      return false;
    }

    if (!fromPhone) {
      logger.error('Twilio phone number not found. Check your environment variables.');
      return false;
    }

    // Use retry logic for sending SMS
    return await retryWithExponentialBackoff(async () => {
      try {
        // Use the Twilio client to send the message
        // This is equivalent to the curl command but using the Twilio SDK
        if (!twilioClient) {
          logger.error('Twilio client not initialized. Check your environment variables.');
          return false;
        }

        // Create message parameters
        const messagingParams = {
          body: message,
          to: formattedPhone,
          from: fromPhone, // Use the fixed "From" number from environment variables
        };

        // Log the full message parameters for debugging
        logger.info('Sending SMS with parameters:', {
          to: messagingParams.to,
          from: messagingParams.from,
          body: messagingParams.body
        });

        // Send the message
        const result = await twilioClient.messages.create(messagingParams);

        // Log the full response for debugging
        logger.info(`SMS sent successfully to ${formattedPhone} with SID: ${result.sid}`, {
          status: result.status,
          direction: result.direction,
          dateCreated: result.dateCreated,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage
        });

        return true;
      } catch (error: any) {
        // Log detailed error information
        logger.error('Error sending SMS:', {
          message: error.message,
          code: error.code,
          status: error.status,
          moreInfo: error.moreInfo,
          details: error.details,
          to: formattedPhone,
          from: fromPhone
        });

        // Rethrow the error for the retry mechanism
        throw error;
      }
    });
  } catch (error) {
    logger.error('Error sending SMS:', error);
    return false;
  }
};

export default {
  twilioClient,
  sendSMS,
  formatPhoneNumber,
  retryWithExponentialBackoff,
  ERROR_CODES,
  TwilioError
};
